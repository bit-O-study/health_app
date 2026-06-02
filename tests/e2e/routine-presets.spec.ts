import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";

// "현재 루틴 저장" (루틴 설정 페이지의 루틴 프리셋 저장) — 저장 + 목록 반영.
test('"현재 루틴 저장" 프리셋이 저장되고 목록에 나타난다', async ({ page }) => {
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  await page.goto("/settings/routine", { waitUntil: "networkidle" });
  const presets = page.locator('section:has-text("루틴 프리셋")');
  await expect(presets).toBeVisible();

  // 레이아웃 회귀 가드: "현재 루틴 저장" 버튼이 카드 폭을 넘어가면 안 된다
  // (모바일에서 입력란이 min-w-0 없이 버튼을 밀어내 overflow 됐던 버그).
  await presets.scrollIntoViewIfNeeded();
  await presets.screenshot({ path: "test-results/routine-presets.png" });
  const saveBtn = presets.getByRole("button", { name: "현재 루틴 저장" });
  const secBox = await presets.boundingBox();
  const btnBox = await saveBtn.boundingBox();
  expect(btnBox!.x + btnBox!.width).toBeLessThanOrEqual(secBox!.x + secBox!.width + 1);

  await presets.getByPlaceholder("예: 가슴 집중 루틴").fill("E2E 테스트 루틴");
  await presets.getByRole("button", { name: "현재 루틴 저장" }).click();

  // 저장 성공: 빨간 에러 없음 + 목록에 방금 저장한 프리셋이 보임
  await expect(presets.getByText("E2E 테스트 루틴")).toBeVisible({ timeout: 10_000 });
  await expect(presets.locator("p.text-red-600, p.text-red-400")).toHaveCount(0);
  await expect(presets.getByText(/운동 \d+개/).first()).toBeVisible();
});
