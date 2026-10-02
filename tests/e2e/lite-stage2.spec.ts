import { expect, test } from "@playwright/test";

import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 라이트 2단계 혜택(2026-10-02) — 3개월 목표 · 몸 사진 · 이번 주 정리 알림 스위치.
 * 무료와 라이트의 경계(목표 1개/3개, 사진 3장/무제한)를 같은 흐름에서 본다.
 */
const LITE_SUB = `insert into public.subscriptions (user_id, platform, product_id, purchase_token, state, expires_at, auto_renewing)
  values ($1, 'google_play', 'helssu_lite_monthly', gen_random_uuid()::text, 'active', now() + interval '20 days', true)`;

/** 최근 5주 벤치·스쿼트를 주 1번씩(무게가 조금씩 오름) — 목표 진행률·예상일이 나올 만큼. */
async function seedLifts(userId: string) {
  for (let w = 0; w < 5; w++) {
    await dbQuery(
      `insert into public.exercise_completions (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus, sets, reps, weight_kg)
       values ($1, (now() at time zone 'Asia/Seoul')::date - $2::int, gen_random_uuid(), 'done', 'bench-press', 'barbell', 'chest', 3, 5, $3),
              ($1, (now() at time zone 'Asia/Seoul')::date - $2::int, gen_random_uuid(), 'done', 'squat', 'barbell', 'lower', 3, 5, $4)`,
      [userId, 28 - w * 7, 70 + w * 2.5, 90 + w * 2.5],
    );
  }
}

/** 1×1 흰 JPEG — 기기에서 다시 줄여 올린다. */
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);

test("목표: 라이트는 3개까지 + 예상 도달일, 시작값은 서버가 정한다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  await silenceDevOverlay(page);
  const { user_id } = await createTestAccount(page.context(), baseURL!, false);
  await seedLifts(user_id);
  // 무료는 맞춤 운동 공개 스위치가 켜져야 보인다 — 공용 설정을 바꾸지 않으려고 라이트로 확인한다.
  await dbQuery(LITE_SUB, [user_id]);

  await page.goto("/fit?tab=growth", { waitUntil: "networkidle" });
  const card = page.getByTestId("fit-goals");
  await expect(card).toContainText("0/3개", { timeout: 15_000 });
  await card.getByRole("button", { name: "목표 정하기" }).click();
  const form = page.getByTestId("goal-form");
  await form.getByRole("combobox").selectOption("bench-press");
  await form.getByLabel("목표 무게(예상 1RM, kg)").fill("100");
  await form.getByRole("button", { name: "목표 저장" }).click();

  const goal = page.getByTestId("goal-bench-press");
  await expect(goal).toBeVisible({ timeout: 15_000 });
  await expect(goal).toContainText("→ 100kg");
  // 5주 동안 꾸준히 올라 예상 도달일이 나온다(라이트).
  await expect(page.getByTestId("goal-line-bench-press")).toContainText("지금 속도면");
  await expect(card).toContainText("1/3개");
  await card.screenshot({ path: "scripts/.verify-shots/lite-goals.png" });
  const rows = await dbQuery<{ start_kg: string; target_kg: string }>(
    `select start_kg::text, target_kg::text from public.lift_goals where user_id=$1`,
    [user_id],
  );
  expect(rows).toHaveLength(1);
  expect(Number(rows[0].target_kg)).toBe(100);
  expect(Number(rows[0].start_kg)).toBeGreaterThan(80); // 서버가 최근 예상 1RM 으로 정했다(80 × (1 + 5/30) ≈ 93.3)

  // 무료 경계(목표 1개)는 서버 액션이 막는다 — goal-progress.test.ts(goalLimit) 와 createGoalAction 이 지킨다.
});

test("몸 사진: 처음엔 동의 → 올리기 · 무료 3장에서 잠금 · 지우기 · 다른 사람은 못 본다", async ({ page, baseURL, browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(180_000);
  await silenceDevOverlay(page);
  const { user_id } = await createTestAccount(page.context(), baseURL!, false);

  await page.goto("/settings/body-photos", { waitUntil: "networkidle" });
  const add = page.getByRole("button", { name: /앞 사진 찍기·고르기/ });
  await expect(add).toBeDisabled({ timeout: 15_000 }); // 동의 전
  await page.getByRole("checkbox").check();
  await page.getByTestId("body-photo-input").setInputFiles({ name: "front.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG });
  await expect(page.getByTestId("body-photo-item")).toHaveCount(1, { timeout: 20_000 });
  const saved = await dbQuery<{ path: string; pose: string }>(`select path, pose from public.body_photos where user_id=$1`, [user_id]);
  expect(saved).toHaveLength(1);
  expect(saved[0].pose).toBe("front");
  expect(saved[0].path.startsWith(`${user_id}/`)).toBe(true);

  // 두 장 더(같은 앞) → 비교가 열리고, 무료 3장이라 잠긴다.
  await page.getByTestId("body-photo-input").setInputFiles({ name: "front2.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG });
  await expect(page.getByTestId("body-photo-item")).toHaveCount(2, { timeout: 20_000 });
  await expect(page.getByTestId("body-photos-delta")).toBeVisible();
  await page.getByTestId("body-photo-input").setInputFiles({ name: "front3.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG });
  await expect(page.getByTestId("body-photo-item")).toHaveCount(3, { timeout: 20_000 });
  await expect(page.getByTestId("body-photos-locked")).toContainText("무료는 3장까지");
  // 사진마다 서명 URL 이 붙는다(비공개 버킷 — 공개 주소가 아니다).
  const srcs = await page.locator("[data-testid=body-photo-item] img").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src));
  expect(srcs).toHaveLength(3);
  for (const src of srcs) expect(src).toContain("/storage/v1/object/sign/body-photos/");
  await page.screenshot({ path: "scripts/.verify-shots/lite-body-photos.png", fullPage: true });

  // 다른 회원은 내 사진이 안 보인다(본인 RLS).
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await silenceDevOverlay(otherPage);
  await createTestAccount(other, baseURL!, false);
  await otherPage.goto("/settings/body-photos", { waitUntil: "networkidle" });
  await expect(otherPage.getByTestId("body-photos")).toBeVisible({ timeout: 15_000 });
  await expect(otherPage.getByTestId("body-photo-item")).toHaveCount(0);
  await other.close();

  // 지우기 — 기록과 파일 함께. 라이트가 되면 다시 올릴 수 있다.
  await page.getByRole("button", { name: /사진 지우기/ }).first().click();
  await expect(page.getByTestId("body-photo-item")).toHaveCount(2, { timeout: 20_000 });
  await dbQuery(LITE_SUB, [user_id]);
  await page.goto("/settings/body-photos", { waitUntil: "networkidle" });
  await expect(page.getByTestId("body-photos-locked")).toHaveCount(0);
  await page.getByTestId("body-photo-input").setInputFiles({ name: "front4.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG });
  await page.getByTestId("body-photo-input").setInputFiles({ name: "front5.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG });
  await expect(page.getByTestId("body-photo-item")).toHaveCount(4, { timeout: 30_000 });

  // 맞춤 운동 리포트 탭에 몸 사진 카드.
  await page.goto("/fit?tab=report", { waitUntil: "networkidle" });
  await expect(page.getByTestId("lite-report-photos")).toContainText("비교하러 가기", { timeout: 15_000 });
});

test("알림 설정에 '이번 주 정리(라이트)' 스위치가 있다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await silenceDevOverlay(page);
  await createTestAccount(page.context(), baseURL!, false);
  await page.goto("/settings/notifications", { waitUntil: "networkidle" });
  await expect(page.getByText("이번 주 정리(라이트)")).toBeVisible({ timeout: 15_000 });
});
