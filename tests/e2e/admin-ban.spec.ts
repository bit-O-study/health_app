import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 관리자가 회원을 영구정지 → 그 회원은 앱 접근이 차단(/suspended)되고,
// 해제하면 다시 접근 가능해야 한다. (DB 로 테스트 계정을 관리자로 승격)
test.describe.configure({ timeout: 180_000 });

test.skip(!hasDb, "needs .env.test.local DB creds");

test("관리자 영구정지 → 회원 차단 → 해제 → 복구", async ({ browser }) => {
  // ── 대상 회원 ──
  const tctx = await browser.newContext({ viewport: { width: 430, height: 920 } });
  const tpage = await tctx.newPage();
  const targetEmail = await signUpAndOnboard(tpage);
  await expect(tpage.getByRole("heading", { name: "오늘의 운동" })).toBeVisible();

  // ── 관리자 ──
  const actx = await browser.newContext({ viewport: { width: 900, height: 920 } });
  const apage = await actx.newPage();
  const adminEmail = await signUpAndOnboard(apage);
  await dbQuery(
    `insert into public.admins(email) values($1) on conflict (email) do nothing`,
    [adminEmail.toLowerCase()],
  );

  // 관리자 → 회원정보, 대상 행에서 영구정지
  await apage.goto("/admin/members", { waitUntil: "networkidle" });
  const row = apage.locator("tr", { hasText: targetEmail });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "영구정지" }).click();
  await apage.getByRole("button", { name: "영구 정지" }).click(); // 확인 다이얼로그
  await expect(row.getByRole("button", { name: "해제" })).toBeVisible({ timeout: 10_000 });

  // 대상 회원은 이제 차단 → /suspended 로
  await tpage.goto("/", { waitUntil: "networkidle" });
  await expect(tpage).toHaveURL(/\/suspended$/);
  await expect(tpage.getByRole("heading", { name: /영구 정지/ })).toBeVisible();

  // 관리자 해제
  await row.getByRole("button", { name: "해제" }).click();
  await expect(row.getByText("정상", { exact: false })).toBeVisible({ timeout: 10_000 });

  // 대상 회원 다시 접근 가능
  await tpage.goto("/", { waitUntil: "networkidle" });
  await expect(tpage).not.toHaveURL(/\/suspended$/);
  await expect(tpage.getByRole("heading", { name: "오늘의 운동" })).toBeVisible();

  await tctx.close();
  await actx.close();
});
