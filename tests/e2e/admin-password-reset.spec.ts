import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 관리자가 회원 비밀번호를 임시 비번으로 초기화 → 회원은 임시 비번으로 로그인하면
// 강제로 비밀번호 변경 화면으로 가고, 변경하면 플래그가 풀린다.
test.describe.configure({ timeout: 180_000 });
test.skip(!hasDb, "needs .env.test.local DB creds");

const flagSql = `select must_change_password as f from public.profiles
  where user_id = (select id from auth.users where lower(email) = lower($1))`;

test("관리자 비밀번호 초기화 → 임시 비번 로그인 → 강제 변경", async ({ browser }) => {
  // ── 대상 회원 생성(세션은 닫고, 새 컨텍스트에서 임시 비번으로 로그인할 것) ──
  const tctx = await browser.newContext();
  const tpage = await tctx.newPage();
  const targetEmail = await signUpAndOnboard(tpage);
  await tctx.close();

  // ── 관리자 ──
  const actx = await browser.newContext({ viewport: { width: 900, height: 920 } });
  const apage = await actx.newPage();
  const adminEmail = await signUpAndOnboard(apage);
  await dbQuery(
    `insert into public.admins(email) values($1) on conflict (email) do nothing`,
    [adminEmail.toLowerCase()],
  );

  // 관리자 → 회원정보 → 대상 행에서 비밀번호 초기화
  await apage.goto("/admin/members", { waitUntil: "networkidle" });
  const row = apage.locator("li", { hasText: targetEmail });
  await expect(row).toBeVisible();
  await row.getByTestId("reset-password").click();
  await apage.getByRole("button", { name: "초기화", exact: true }).click();

  // 임시 비번이 화면에 표시됨 → 값 확보
  const tempLoc = row.getByTestId("temp-password");
  await expect(tempLoc).toBeVisible({ timeout: 15_000 });
  const temp = ((await tempLoc.textContent()) ?? "").trim();
  expect(temp.length).toBeGreaterThanOrEqual(6);

  // DB: must_change_password = true
  const f1 = await dbQuery<{ f: boolean }>(flagSql, [targetEmail]);
  expect(f1[0]?.f).toBe(true);

  // ── 새 컨텍스트에서 임시 비번으로 로그인 → 강제로 /change-password ──
  const cctx = await browser.newContext();
  const cpage = await cctx.newPage();
  await cpage.goto("/login", { waitUntil: "networkidle" });
  await cpage.fill("#email", targetEmail);
  await cpage.fill("#password", temp);
  await cpage.getByRole("button", { name: "로그인" }).last().click();
  await cpage.waitForURL(/\/change-password$/, { timeout: 30_000 });

  // 새 비밀번호로 변경 → 변경 화면을 벗어남
  const NEWPW = "newpw123456";
  await cpage.fill("#new-password", NEWPW);
  await cpage.fill("#confirm-password", NEWPW);
  await cpage.getByTestId("change-password-submit").click();
  await cpage.waitForURL(
    (u) => !new URL(u).pathname.startsWith("/change-password"),
    { timeout: 30_000 },
  );

  // DB: 플래그 해제됨
  const f2 = await dbQuery<{ f: boolean }>(flagSql, [targetEmail]);
  expect(f2[0]?.f).toBe(false);

  await actx.close();
  await cctx.close();
});
