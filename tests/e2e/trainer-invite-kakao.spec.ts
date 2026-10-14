import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 트레이너 초대 — 카카오톡으로 직접 보내기(무료, 2026-10-14).
// 예전엔 알림톡·문자뿐이라 발송 업체 설정이 없으면 초대가 '발송 대기'로만 남고 회원에게 가지 않았다.
// 이제 휴대폰 번호 없이 초대 링크를 만들고, 그룹 초대처럼 카카오톡 공유 카드(또는 링크 복사)로 보낸다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;

test("번호 없이 초대 링크를 만들어 카카오톡으로 보내고, 회원이 그 링크로 연결한다", async ({ page, browser }) => {
  test.skip(!hasDb, "needs DB fixtures");
  // 발송 업체가 설정된 환경에서는 화면이 다르다(알림톡·문자 선택지가 같이 나온다).
  test.skip(Boolean(process.env.SOLAPI_API_KEY), "requires messaging to be unconfigured");
  test.setTimeout(180_000);
  const trainerEmail = await createOnboardedAccount(page);
  await dbQuery(
    `insert into public.pt_passes(trainer_id,name,phone,status,starts_on,ends_on,seats)
     values(${uid},'검증 트레이너','01012345678','active',(now() at time zone 'Asia/Seoul')::date-1,'infinity'::date,15)`,
    [trainerEmail],
  );

  await page.goto("/trainer/members", { waitUntil: "networkidle" });
  // 번호 칸도, 알림톡 선택도 없다 — 버튼 하나로 링크를 만든다.
  await expect(page.getByLabel("회원 휴대폰 번호")).toHaveCount(0);
  await page.getByRole("button", { name: "초대 보내기", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("초대 링크를 만들었어요", { timeout: 20_000 });

  const share = page.getByTestId("trainer-invite-share");
  await expect(share.getByRole("button", { name: "카카오톡으로 보내기" })).toBeVisible();
  await expect(share.getByRole("button", { name: "링크 복사" })).toBeVisible();
  const link = await share.getByLabel("초대 링크 (7일 유효)").inputValue();
  expect(link).toMatch(/\/trainer\/invite\/[a-f0-9]{64}$/);

  // 번호 없는 초대 한 건, 발송 대기 행은 없다(서버가 보낼 것이 없다).
  const rows = await dbQuery<{ phone: string | null; notes: number }>(
    `select i.phone, (select count(*)::int from public.pt_notifications n where n.trainer_id=i.trainer_id) notes
       from public.pt_invites i where i.trainer_id=${uid}`,
    [trainerEmail],
  );
  expect(rows).toEqual([{ phone: null, notes: 0 }]);

  // 회원이 받은 링크를 열어 수락하면 바로 연결된다.
  const memberContext = await browser.newContext();
  try {
    const member = await memberContext.newPage();
    await createOnboardedAccount(member);
    const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
    await member.goto(`${baseUrl}${new URL(link).pathname}`);
    await member.getByLabel("이 트레이너의 관리를 받는 데 동의합니다.", { exact: true }).check();
    await member.getByRole("button", { name: "동의하고 연결", exact: true }).click();
    await expect(member).toHaveURL(/\/settings\/trainers$/);
    await expect(member.getByRole("heading", { name: "검증 트레이너", exact: true })).toBeVisible();
  } finally {
    await memberContext.close();
  }
});
