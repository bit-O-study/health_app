import fs from "node:fs";

import { expect, test } from "@playwright/test";

import { createOnboardedAccount, seedRecommendedExercises } from "./helpers/auth";
import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 라이트 2단계(2026-10-02) — 5 아픈 부위 대체 운동 · 4 1년 돌아보기.
 */
const uid = `(select id from auth.users where lower(email)=lower($1))`;
const liteSub = (who: string) =>
  `insert into public.subscriptions (user_id, platform, product_id, purchase_token, state, expires_at, auto_renewing)
   values (${who}, 'google_play', 'helssu_lite_monthly', gen_random_uuid()::text, 'active', now() + interval '20 days', true)`;

test("아픈 부위: 무료는 안내만, 라이트는 오늘만 다른 운동으로 바꾸고 루틴은 그대로", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(240_000);
  await silenceDevOverlay(page);
  const email = await createOnboardedAccount(page);
  await seedRecommendedExercises(page); // 오늘을 운동하는 날로 + 추천 운동

  // 오늘 운동에 실제로 있는 부위를 아픈 부위로 — 오늘 구성은 날마다 달라 하나씩 찾아본다.
  let found = false;
  for (const part of ["chest", "lower", "back", "shoulder", "arm"]) {
    await dbQuery(`update public.profiles set pain_areas = array[$2]::text[] where user_id=${uid}`, [email, part]);
    await page.goto("/routine", { waitUntil: "networkidle" });
    if (await page.getByTestId("daily-pain").isVisible().catch(() => false)) {
      found = true;
      break;
    }
  }
  expect(found, "오늘 운동에 아픈 부위로 고를 운동이 있어야 한다").toBe(true);

  // 무료: 바꾸기 대신 라이트 안내.
  await expect(page.getByTestId("pain-swap-locked")).toBeVisible();
  await expect(page.getByTestId("pain-swap")).toHaveCount(0);

  await dbQuery(liteSub(uid), [email]);
  const routineBefore = await dbQuery(
    `select id, exercise_id, sets, reps from public.routine_exercises where user_id=${uid} order by id`,
    [email],
  );
  await page.goto("/routine", { waitUntil: "networkidle" });
  const swap = page.getByTestId("pain-swap");
  await expect(swap).toContainText("→", { timeout: 20_000 });
  await swap.getByRole("button", { name: "오늘만 다른 운동으로 바꾸기" }).click();
  await expect(page.getByText(/오늘만 \d+개 바꿨어요/)).toBeVisible({ timeout: 45_000 });

  // 오늘 계획에서 아픈 부위 운동이 빠져 알림이 사라지고, 내 루틴은 그대로.
  await page.goto("/routine", { waitUntil: "networkidle" });
  await expect(page.getByTestId("daily-pain")).toHaveCount(0, { timeout: 20_000 });
  const routineAfter = await dbQuery(
    `select id, exercise_id, sets, reps from public.routine_exercises where user_id=${uid} order by id`,
    [email],
  );
  expect(routineAfter).toEqual(routineBefore);
});

test("1년 돌아보기: 잔디·한 해 숫자·공유 이미지(라이트)", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  await silenceDevOverlay(page);
  const { user_id } = await createTestAccount(page.context(), baseURL!, false);
  for (const [daysAgo, kg] of [
    [3, 65],
    [10, 62.5],
    [17, 60],
  ] as const) {
    await dbQuery(
      `insert into public.exercise_completions (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus, sets, reps, weight_kg)
       values ($1, (now() at time zone 'Asia/Seoul')::date - $2::int, gen_random_uuid(), 'done', 'bench-press', 'barbell', 'chest', 3, 8, $3)`,
      [user_id, daysAgo, kg],
    );
  }
  await dbQuery(liteSub("$1"), [user_id]);

  await page.goto("/fit?tab=report", { waitUntil: "networkidle" });
  await page.getByTestId("fit-year-link").click();
  await page.waitForURL("**/fit/year", { timeout: 20_000 });
  await expect(page.getByTestId("year-grid")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid="year-grid"] [data-level]:not([data-level="0"])')).toHaveCount(3);
  const stats = page.getByTestId("year-stats");
  await expect(stats).toContainText("3일");
  await expect(stats).toContainText("벤치프레스 3일");
  await expect(stats).toContainText("3주");
  // 60 → 62.5 → 65kg × 8회 — 예상 1RM 이 오를 때마다 신기록(가장 크게 오른 것).
  await expect(stats).toContainText("벤치프레스 +");
  // 최근 주가 화면에 보인다(rtl 스크롤 — 오른쪽 끝부터).
  await expect(page.locator('[data-testid="year-grid"] [data-level]:not([data-level="0"])').first()).toBeInViewport();
  await page.screenshot({ path: "scripts/.verify-shots/lite-year.png", fullPage: true });

  const img = await page.request.get("/api/fit/year-image");
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toContain("image/png");
  fs.writeFileSync("scripts/.verify-shots/lite-year-image.png", await img.body());
  await page.getByTestId("share-year-image").click();
  await expect(page.getByRole("dialog", { name: "1년 기록 이미지" })).toBeVisible();
});
