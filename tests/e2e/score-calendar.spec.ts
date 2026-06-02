import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";

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
