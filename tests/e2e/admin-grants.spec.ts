import { adminUrl, openMemberPanel } from "./helpers/admin-console";
import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 관리자 '요금제 지급' 메뉴: 검색으로 회원을 찾아 라이트·트레이너 이용권을 결제·신청 없이 넣는다.
// 검증유저(E2E 계정)는 회원정보·지급 대상에서 기본으로 숨고, ?verify=1 일 때만 보인다.
test.describe.configure({ timeout: 240_000 });

test.skip(!hasDb, "needs .env.test.local DB creds");

test("검증유저 숨김 → 요금제 지급: 라이트 지급·회수, 트레이너 이용권 지급", async ({ browser }) => {
  const tctx = await browser.newContext({ viewport: { width: 430, height: 920 } });
  const tpage = await tctx.newPage();
  const targetEmail = await signUpAndOnboard(tpage);
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  const actx = await browser.newContext({ viewport: { width: 1100, height: 1000 } });
  const apage = await actx.newPage();
  const adminEmail = await signUpAndOnboard(apage);
  await dbQuery(
    `insert into public.admins(email) values($1) on conflict (email) do nothing`,
    [adminEmail.toLowerCase()],
  );

  try {
    // ── 회원정보: 검증유저는 기본으로 안 보이고, 링크를 누르면 보인다 ──
    await apage.goto(adminUrl("/admin/members"), { waitUntil: "networkidle" });
    await expect(apage.getByRole("heading", { name: "회원", exact: true })).toBeVisible(); // BOadmin 2.0 제목
    await expect(apage.locator("li", { hasText: targetEmail })).toHaveCount(0);
    await apage.getByRole("link", { name: /검증유저 \d+명 숨김 · 보기/ }).click();
    await expect(apage.locator("li", { hasText: targetEmail })).toBeVisible();

    // ── 요금제 지급: 사이드바 메뉴로 들어간다. 검증유저는 지급 대상에 없다 ──
    await apage.getByRole("link", { name: "요금제 지급" }).first().click();
    await expect(apage.getByRole("heading", { name: "요금제 지급" })).toBeVisible();
    const liteSelect = apage.getByLabel("라이트 지급 회원", { exact: true });
    await expect(liteSelect.locator("option", { hasText: targetEmail })).toHaveCount(0);

    await apage.goto(adminUrl("/admin/grants?verify=1"), { waitUntil: "networkidle" });
    // 검색어를 넣으면 그 회원만 남는다 → Enter 로 고른다.
    const liteSearch = apage.getByLabel("라이트 지급 회원 검색");
    await liteSearch.fill(targetEmail);
    await expect(liteSelect.locator("option")).toHaveCount(2); // '회원 선택' + 한 명
    await liteSearch.press("Enter");
    await apage.getByLabel("라이트 지급 기간").first().selectOption("3");
    await apage.getByRole("button", { name: "라이트 지급" }).click();
    await apage.getByRole("button", { name: "지급", exact: true }).click(); // 확인 다이얼로그
    await expect(apage.getByText("라이트 3개월을 지급했습니다.")).toBeVisible({ timeout: 15_000 });
    await apage.screenshot({ path: "test-results/admin-grants.png", fullPage: true });

    const sub = await dbQuery<{ product_id: string; state: string; granted: boolean; months: number }>(
      `select product_id, state, purchase_token like 'admin-grant:%' as granted,
              round(extract(epoch from (expires_at - now())) / 86400 / 30)::int as months
         from public.subscriptions where user_id = ${uid}`,
      [targetEmail],
    );
    expect(sub[0]).toMatchObject({ product_id: "helssu_lite_monthly", state: "active", granted: true, months: 3 });

    // 지급받은 회원의 앱에서 라이트로 보인다.
    await tpage.goto("/settings/subscription", { waitUntil: "networkidle" });
    await expect(tpage.getByText(/까지 이용하고 끝나요/).first()).toBeVisible({ timeout: 15_000 });

    // 회원 상세 패널의 요금제(BOadmin 2.0: 표의 요금제 칸은 넓은 화면에서만 보인다)
    await apage.goto(adminUrl("/admin/members?verify=1"), { waitUntil: "networkidle" });
    const panel = await openMemberPanel(apage, targetEmail);
    await expect(panel.getByText(/라이트 \(지급\) · ~\d{4}-\d{2}-\d{2}/)).toBeVisible();

    // ── 회수: 지급 중인 회원 목록에서 ──
    await apage.goto(adminUrl("/admin/grants?verify=1"), { waitUntil: "networkidle" });
    const grantedRow = apage.getByTestId("lite-granted-list").locator("li", { hasText: targetEmail });
    await expect(grantedRow).toBeVisible();
    await grantedRow.getByRole("button", { name: "지급 회수" }).click();
    await apage.getByRole("button", { name: "회수", exact: true }).click();
    await expect(grantedRow).toHaveCount(0, { timeout: 15_000 });
    const after = await dbQuery<{ state: string; live: boolean }>(
      `select state, expires_at > now() as live from public.subscriptions where user_id = ${uid}`,
      [targetEmail],
    );
    expect(after[0]).toEqual({ state: "expired", live: false });

    // ── 트레이너 이용권: 신청 없이 지급 ──
    const trainerSearch = apage.getByLabel("이용권 지급 회원 검색");
    await trainerSearch.fill(targetEmail);
    await trainerSearch.press("Enter");
    await expect(apage.getByLabel("이름")).toHaveValue("검증유저");
    await apage.getByLabel("휴대폰").fill("010-1234-5678");
    await apage.getByRole("button", { name: "이용권 지급" }).click();
    await expect(apage.getByText(/이용권을 지급했어요/)).toBeVisible({ timeout: 15_000 });
    const pass = await dbQuery<{ status: string; phone: string; seats: number; on: boolean }>(
      `select status, phone, seats, public.pt_has_pass(trainer_id) as on from public.pt_passes where trainer_id = ${uid}`,
      [targetEmail],
    );
    expect(pass[0]).toEqual({ status: "active", phone: "01012345678", seats: 15, on: true });

    // 지급한 이용권은 트레이너 이용권 화면에서 관리한다.
    await apage.goto(adminUrl("/admin/trainers"), { waitUntil: "networkidle" });
    await expect(apage.getByRole("heading", { name: /검증유저 · 01012345678/ }).first()).toBeVisible();
  } finally {
    await dbQuery(`delete from public.admins where email = $1`, [adminEmail.toLowerCase()]);
    await tctx.close();
    await actx.close();
  }
});
