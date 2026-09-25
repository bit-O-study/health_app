import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";

// 루틴 추천 고도화 2단계(H3): '추천으로 채우기' 로 들어온 운동엔 왜 골랐는지 한 줄이 보인다.
// 1단계(필수 동작): 추천 이유에 동작 이름(예: '수직 당기기', '무릎 주도')이 적힌다.
test("루틴 편집에서 추천으로 채우면 운동마다 추천 이유가 보인다", async ({ page }) => {
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  await page.goto("/plan", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "추천으로 채우기" }).first().click();
  const confirm = page.getByRole("button", { name: "교체하기" });
  if (await confirm.isVisible().catch(() => false)) await confirm.click();

  const reasons = page.getByTestId("recommend-reason");
  await expect(reasons.first()).toBeVisible({ timeout: 15_000 });
  await expect(reasons.first()).toContainText("추천 · ");
  expect(await reasons.count()).toBeGreaterThanOrEqual(3);
});
