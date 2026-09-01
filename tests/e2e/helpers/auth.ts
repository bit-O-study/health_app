import { expect, type Page } from "@playwright/test";

import { dbQuery, hasDb } from "./db";

/** Unique throwaway email. Prefix `e2e_` lets global-teardown clean it up. */
export function freshEmail(): string {
  return `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
}

export const TEST_PASSWORD = "test123456";

/**
 * Sign up a brand-new account and complete onboarding, landing on the home page.
 * On localhost the signup flow skips phone OTP (see auth-form isLocalEnv).
 * Returns the email used (for assertions / cleanup).
 *
 * NOTE: onboarding always saves the routine in "manual" fill mode (the onboarding
 * handler ignores the fill toggle), so NO exercises are seeded here. Call
 * seedRecommendedExercises() afterwards when a spec needs a populated workout.
 */
/**
 * 직전에 만든 계정 이메일 — `seedRecommendedExercises` 가 루틴 일차를 맞출 때 쓴다.
 * (playwright.config 이 `workers: 1` · `fullyParallel: false` 라 한 번에 한 계정만 산다.)
 */
let lastSignedUpEmail: string | null = null;

export async function signUpAndOnboard(page: Page): Promise<string> {
  const email = freshEmail();
  lastSignedUpEmail = email;

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "회원가입" }).click();
  await page.waitForSelector("#name", { timeout: 15_000 });
  await page.fill("#name", "검증유저");
  await page.fill("#phone", "010-1234-5678");
  await page.fill("#email", email);
  await page.fill("#password", TEST_PASSWORD);
  await page.getByRole("button", { name: "회원가입" }).last().click();
  await page.waitForURL("**/onboarding", { timeout: 30_000 });

  // gender → next
  await page.getByRole("button", { name: "남자" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  // experience: first option → next
  await page.locator("section button.w-full").first().click();
  await page.getByRole("button", { name: "다음" }).click();
  // body: height/weight + first body type → next
  await page.locator('input[placeholder="170"]').fill("175");
  await page.locator('input[placeholder="65"]').fill("75");
  await page.locator("section button.w-full").first().click();
  await page.getByRole("button", { name: "다음" }).click();
  // goal → "현재 유지"(목표치 입력 불필요) → next  (온보딩에 목표 단계가 추가됨)
  await page.getByRole("button", { name: /현재 유지/ }).click();
  await page.getByRole("button", { name: "다음" }).click();
  // gym → skip
  await page.getByRole("button", { name: "건너뛰기" }).click();
  await page.waitForTimeout(400);
  // recommend step → save routine → home (/routine, 과거엔 / 였음 — 둘 다 허용)
  await page.getByRole("button", { name: "저장" }).last().click();
  await page.waitForURL(
    (u) => ["/", "/routine"].includes(new URL(u).pathname),
    { timeout: 30_000 },
  );

  return email;
}

/**
 * Populate the user's plan with recommended exercises for all focuses via the
 * real /plan "추천으로 등록" action, then return to home. Today then shows a
 * full workout (warmup + main + cooldown).
 */
export async function seedRecommendedExercises(page: Page): Promise<void> {
  await page.goto("/plan", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "추천으로 등록" }).click();
  await page.getByRole("button", { name: "교체하기" }).click();
  // 추천 등록 후 클라이언트는 홈(/routine, 과거 /)으로 이동.
  await page.waitForURL(
    (u) => ["/", "/routine"].includes(new URL(u).pathname),
    { timeout: 30_000 },
  );
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await ensureTodayIsWorkoutDay(page);
  // sanity: 오늘의 운동(/routine)에 시작 가능한 워크아웃이 있어야 한다.
  await expect(page.getByRole("button", { name: "운동 시작" })).toBeVisible();
}

/**
 * 오늘이 주기상 **휴식일**이면 루틴 시작일을 하루씩 당겨 운동일에 맞춘다.
 *
 * 시드 루틴은 주기(예: PPL+휴식)를 돌기 때문에 **달력 날짜에 따라 3일에 한 번쯤
 * 오늘이 휴식일**이 되고, 그날은 `운동 시작` 버튼이 없어 시드를 쓰는 스펙이 통째로
 * 깨졌다(내용과 무관한 날짜 의존 실패 — 2026-09-01 에 실제로 터졌다).
 *
 * 루틴 **내용은 그대로** 두고 "오늘이 주기의 몇 일차인가"만 옮긴다 — 그 값은 원래
 * 달력에 따라 달라지는 값이라, 고정한다고 검증이 약해지지 않는다.
 * DB 자격증명이 없으면(스펙이 어차피 skip 된다) 아무것도 안 한다.
 */
async function ensureTodayIsWorkoutDay(page: Page): Promise<void> {
  if (!hasDb || !lastSignedUpEmail) return;
  const uid = `(select id from auth.users where lower(email)=lower($1))`;
  // 주기는 최대 7일 — 7번 안에 반드시 운동일을 만난다.
  for (let i = 0; i < 7; i++) {
    if (await page.getByRole("button", { name: "운동 시작" }).count()) return;
    await dbQuery(
      `update public.user_routines
          set start_date = start_date - 1
        where user_id = ${uid}`,
      [lastSignedUpEmail],
    );
    await page.goto("/routine", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
  }
}
