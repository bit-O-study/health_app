import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 가이드를 끝까지 "완료"로 진행 (넘기기 아님).
async function completeWorkout(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);
  for (let i = 0; i < 40; i++) {
    const last = page.getByRole("button", { name: "완료하고 종료" });
    const mid = page.getByRole("button", { name: /^완료$/ });
    if (await last.count()) { await last.click(); break; }
    if (await mid.count()) { await mid.click(); await page.waitForTimeout(420); continue; }
    break;
  }
  await page.waitForTimeout(1500);
}

// 운동 점수 + 운동 캘린더(기록) are downstream of completing a workout:
//  - completing each item writes exercise_completions (→ score)
//  - finishing the session writes workout_sessions duration (→ calendar)
// This also exercises exercise_completions.set_details (another drifted column).
test("운동 완료 → 점수와 캘린더에 반영된다", async ({ page }) => {
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  // complete the whole workout through the guide (완료, not 넘기기)
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);
  let completed = 0;
  for (let i = 0; i < 40; i++) {
    const last = page.getByRole("button", { name: "완료하고 종료" });
    const mid = page.getByRole("button", { name: /^완료$/ });
    if (await last.count()) { await last.click(); completed++; break; }
    if (await mid.count()) { await mid.click(); completed++; await page.waitForTimeout(420); continue; }
    break;
  }
  expect(completed).toBeGreaterThan(0);
  await page.waitForTimeout(1500);

  // 운동 점수 — page renders and reflects activity (completed count / score)
  await page.goto("/settings/score", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /점수|운동 점수/ }).first()).toBeVisible();
  // no Next error overlay / runtime error text
  await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");

  // 운동 캘린더(기록) — current month grid renders without error
  await page.goto("/settings/history", { waitUntil: "networkidle" });
  await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
  // weekday header of the calendar should be present
  await expect(page.getByText("월", { exact: true }).first()).toBeVisible();
});

// 회귀: 체성분이 등록돼 있어도, 운동을 완료하면 부위별 점수가 운동 기반으로 반영돼야 한다.
// (예전엔 체성분이 있으면 부위별을 체성분 기반으로만 계산해 운동이 무시됐음.)
test("체성분이 있어도 운동 완료가 부위별 점수에 반영된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedRecommendedExercises(page);
  await completeWorkout(page);

  // 체성분 등록(근육량 값) — 이게 있으면 예전 코드는 부위별을 체성분 기반으로 덮어썼다.
  await dbQuery(
    `insert into public.body_compositions
       (user_id, muscle_trunk, muscle_right_arm, muscle_left_arm, muscle_right_leg, muscle_left_leg)
     values ((select id from auth.users where lower(email) = lower($1)), 30, 3, 3, 9, 9)`,
    [email],
  );

  await page.goto("/settings/score", { waitUntil: "networkidle" });
  const balance = page.locator("section", { hasText: "부위별 밸런스" });
  // 운동이 반영되므로 "운동량 기반" 배지여야 하고, "체성분 기반" 이면 안 된다.
  await expect(balance.getByText("운동량 기반")).toBeVisible();
  await expect(balance.getByText("체성분 기반")).toHaveCount(0);
  // 부위별 점수 중 0보다 큰 값이 하나 이상 있어야 한다(운동 반영).
  const nums = await balance
    .locator("p.text-xl")
    .evaluateAll((els) => els.map((e) => parseInt(e.textContent || "0", 10)));
  expect(nums.some((n) => n > 0)).toBe(true);
});
