import { expect, type Page } from "@playwright/test";

/**
 * 런처(홈)에서 앱으로 들어간다 (2026-09-20).
 *
 * 예전엔 어느 화면에서든 하단바에 `식단`·`캘린더` 같은 칸이 있어서
 * `getByRole("link", { name: "식단" }).click()` 한 줄이면 됐다.
 * 지금은 하단바가 **지금 있는 앱의 메뉴**라 그 칸이 없다 — 홈(런처)으로 나가서
 * 앱 아이콘을 누르는 게 실제 사용자 경로다.
 *
 * 앱 격자는 화면 위쪽이라 dev 오버레이(왼쪽 아래)에 가리지 않는다.
 */
export async function openApp(page: Page, label: string): Promise<void> {
  await page.goto("/home", { waitUntil: "networkidle" });
  const grid = page.getByRole("navigation", { name: "앱" });
  await expect(grid).toBeVisible({ timeout: 15_000 });
  await grid.getByRole("link", { name: label, exact: true }).click();
}
