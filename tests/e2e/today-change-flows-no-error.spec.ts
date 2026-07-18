import { expect, test, type Page } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { hasDb } from "./helpers/db";

// 재현/회귀(버그5): '오늘만 운동 바꾸기'의 두 흐름에서 에러가 터지면 안 된다.
//  ① 오늘만 운동 바꾸기 → 운동 직접 담기
//  ② 오늘만 운동 바꾸기 → 부위 선택 → 운동 전체 바꾸기 → (뒤로) → 다시 오늘만 운동 바꾸기
//     → 부위 선택 → 오늘만 부위 추가
// page 크래시(에러 바운더리)·콘솔 에러를 수집해 없어야 통과.

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return errors;
}

// 알림 권한 넛지(권한 거부 환경에서 계속 뜸)를 닫아 페이지 리렌더 간섭을 없앤다.
async function dismissNudge(page: Page) {
  const later = page.getByRole("button", { name: "나중에" });
  if (await later.count()) await later.first().click().catch(() => {});
}

async function openAdjustMenu(page: Page) {
  await dismissNudge(page);
  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();
  await expect(
    page.getByRole("heading", { name: "오늘만 운동 바꾸기" }),
  ).toBeVisible({ timeout: 8000 });
}

test("① 직접 담기 흐름은 에러 없이 편집 페이지로 간다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const errors = collectErrors(page);
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  await openAdjustMenu(page);
  await page.getByRole("button", { name: "운동 직접 담기" }).click();
  await expect(page).toHaveURL(/\/plan\/today/, { timeout: 30000 });
  await page.waitForTimeout(1000);
  // 편집 페이지 헤딩이 떠야(크래시면 에러 바운더리라 안 뜸).
  await expect(
    page.getByRole("heading", { name: "오늘만 운동 바꾸기" }),
  ).toBeVisible({ timeout: 8000 });
  expect(errors, errors.join("\n")).toEqual([]);
});

test("② 전체 바꾸기 후 부위 추가 흐름도 에러 없다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const errors = collectErrors(page);
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  // 전체 바꾸기: 어깨 선택 → 운동 전체 바꾸기
  await openAdjustMenu(page);
  await page.getByRole("button", { name: "어깨", exact: true }).click();
  await page.getByRole("button", { name: "운동 전체 바꾸기" }).click();
  await expect(page).toHaveURL(/\/plan\/today/, { timeout: 30000 });
  await page.waitForTimeout(1000);

  // 뒤로 → /routine
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 다시 오늘만 운동 바꾸기 → 하체 선택 → 오늘만 부위 추가
  await openAdjustMenu(page);
  await page.getByRole("button", { name: "하체", exact: true }).click();
  await page.getByRole("button", { name: "오늘만 부위 추가" }).click();
  await expect(page).toHaveURL(/\/plan\/today/, { timeout: 30000 });
  await page.waitForTimeout(1000);
  await expect(
    page.getByRole("heading", { name: "오늘만 운동 바꾸기" }),
  ).toBeVisible({ timeout: 8000 });
  expect(errors, errors.join("\n")).toEqual([]);
});