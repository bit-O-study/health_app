/** Admin UI runs as a second application; local Supabase cookies share the host. */
export function adminUrl(path = "/admin"): string {
  const origin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3120";
  const target = path === "/admin" ? "/admin" : path.replace(/^\/admin\//, "/admin/health/");
  return new URL(target, origin).toString();
}

import type { Page } from "@playwright/test";

/**
 * BOadmin 2.0(2026-10-27): 위쪽 서비스 전환 → 헬쑤 → 탭(→ 세그먼트)으로 이동한다.
 * 예전 왼쪽 사이드바 링크(예: "크론 실행")는 없어졌다.
 */
export async function openHealthMenu(page: Page, tab: string, segment?: string): Promise<void> {
  await page.getByRole("button", { name: "전체 서비스" }).click();
  await page.getByRole("menuitem", { name: /^헬쑤/ }).click();
  await page.getByRole("navigation", { name: "헬쑤 메뉴" }).getByRole("link", { name: new RegExp("^" + tab) }).click();
  if (segment) await page.getByRole("navigation", { name: `${tab} 세부 화면` }).getByRole("link", { name: segment, exact: true }).click();
}

/** BOadmin 2.0: 회원 줄을 눌러 오른쪽 상세 패널을 연다(정지·비밀번호 버튼은 패널에 있다). */
export async function openMemberPanel(page: Page, email: string) {
  await page.locator("li", { hasText: email }).getByRole("link").first().click();
  const panel = page.getByRole("complementary", { name: /회원 상세/ });
  await panel.getByText(email, { exact: true }).waitFor();
  return panel;
}
