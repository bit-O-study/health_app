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
  // "/" 는 모드 선택 랜딩(루틴/파워리프팅)이라 운동 화면은 /routine 으로 직접 이동.
  await tpage.goto("/routine", { waitUntil: "networkidle" });
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
  await apage.screenshot({ path: "test-results/admin-members.png", fullPage: true });
  const row = apage.locator("li", { hasText: targetEmail });
  await expect(row).toBeVisible();
  // 정지 사유 입력 후 영구정지
  await row.getByPlaceholder("정지 사유 (선택)").fill("E2E 영구정지 사유");
  await row.getByRole("button", { name: "영구정지" }).click();
  await apage.getByRole("button", { name: "영구 정지" }).click(); // 확인 다이얼로그
  await expect(row.getByRole("button", { name: "해제" })).toBeVisible({ timeout: 10_000 });

  // 대상 회원은 이제 차단 → /suspended 로 + 사유 표시
  await tpage.goto("/", { waitUntil: "networkidle" });
  await expect(tpage).toHaveURL(/\/suspended$/);
  await expect(tpage.getByRole("heading", { name: /영구 정지/ })).toBeVisible();
  await expect(tpage.getByText("E2E 영구정지 사유")).toBeVisible();
  await tpage.screenshot({ path: "test-results/suspended-final.png", fullPage: true });

  // 관리자 해제
  await row.getByRole("button", { name: "해제" }).click();
  await expect(row.getByText("정상", { exact: false })).toBeVisible({ timeout: 10_000 });

  // 대상 회원 다시 접근 가능 ("/" 는 모드선택 랜딩이라 운동 화면은 /routine 으로 직접)
  await tpage.goto("/routine", { waitUntil: "networkidle" });
  await expect(tpage).not.toHaveURL(/\/suspended$/);
  await expect(tpage.getByRole("heading", { name: "오늘의 운동" })).toBeVisible();

  await tctx.close();
  await actx.close();
});

test("관리자 기간정지(7일) → 회원 차단 → DB 반영", async ({ browser }) => {
  const tctx = await browser.newContext({ viewport: { width: 430, height: 920 } });
  const tpage = await tctx.newPage();
  const targetEmail = await signUpAndOnboard(tpage);

  const actx = await browser.newContext({ viewport: { width: 900, height: 920 } });
  const apage = await actx.newPage();
  const adminEmail = await signUpAndOnboard(apage);
  await dbQuery(
    `insert into public.admins(email) values($1) on conflict (email) do nothing`,
    [adminEmail.toLowerCase()],
  );

  await apage.goto("/admin/members", { waitUntil: "networkidle" });
  const row = apage.locator("li", { hasText: targetEmail });
  await expect(row).toBeVisible();
  await row.getByPlaceholder("정지 사유 (선택)").fill("E2E 기간정지");
  await row.getByRole("button", { name: "7일" }).click();
  // 정지 배지 + 해제 버튼 노출
  await expect(row.getByRole("button", { name: "해제" })).toBeVisible({ timeout: 10_000 });

  // DB 에 suspended_until 이 미래로 설정됐는지 확인
  const rows = await dbQuery<{ suspended_until: string | null; banned_at: string | null }>(
    `select suspended_until, banned_at from public.profiles
     where user_id = (select id from auth.users where lower(email) = lower($1))`,
    [targetEmail],
  );
  expect(rows[0]?.suspended_until).not.toBeNull();
  expect(rows[0]?.banned_at).toBeNull();
  expect(new Date(rows[0]!.suspended_until!).getTime()).toBeGreaterThan(Date.now());

  // 대상 회원은 차단 → /suspended (영구정지 아님)
  await tpage.goto("/", { waitUntil: "networkidle" });
  await expect(tpage).toHaveURL(/\/suspended$/);
  await expect(tpage.getByRole("heading", { name: /이용이 정지된 계정/ })).toBeVisible();

  await tctx.close();
  await actx.close();
});
