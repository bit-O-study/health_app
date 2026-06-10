import { expect, test } from "@playwright/test";

// 앱 진입 스플래시: 켜자마자 로고(브랜드)가 떴다가, 잠시 뒤 사라지고 앱 화면이 보인다.
// (모션 자체는 CSS라 단언하기 어렵지만, '떴다가 사라진다'는 동작을 가드한다.)

test("앱 진입 스플래시가 떴다가 사라진다", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // 진입 직후: 스플래시 오버레이에 브랜드명이 보인다.
  const splash = page.locator(".app-splash");
  await expect(splash).toBeVisible();
  await expect(splash).toContainText("헬쑤");

  // 잠시 뒤(약 1.35s) DOM 에서 제거된다 → 앱 화면으로 전환.
  await expect(splash).toHaveCount(0, { timeout: 5000 });
});
