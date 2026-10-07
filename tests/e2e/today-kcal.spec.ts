import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";

// 운동 탭 진행 카드에 소모 칼로리를 작게 다시 보여 준다(2026-10-07) — "소모 / 약 예상 kcal".
test("운동 탭 진행 카드에 소모 칼로리 한 줄이 보인다", async ({ page }) => {
  test.setTimeout(150_000);
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);
  await page.goto("/routine", { waitUntil: "networkidle" });
  const line = page.getByTestId("today-kcal");
  await expect(line).toBeVisible({ timeout: 20_000 });
  await expect(line).toHaveText(/^0 \/ 약 [\d,]+kcal$/);
});
