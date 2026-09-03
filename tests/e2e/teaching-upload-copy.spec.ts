import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";

test("운동 영상을 올려 티칭받는 동선으로 문구가 안내된다", async ({ page }) => {
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "운동 시작" }).click();

  const upload = page.getByRole("button", { name: "영상 올리고 티칭받기" });
  await expect(upload).toBeVisible();
  await upload.click();

  const dialog = page.getByRole("dialog", { name: /내 운동 영상 올리고 티칭받기/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "영상 올리고 티칭받기" })).toBeVisible();
});
