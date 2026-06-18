import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 로그인 화면의 아이디 찾기 / 비밀번호 찾기.
// 로컬(localhost)에선 휴대폰 OTP 를 건너뛰므로 신원 매칭(이름/이메일+휴대폰)만으로 진행.
test.describe.configure({ timeout: 180_000 });
test.skip(!hasDb, "needs .env.test.local DB creds");

const uidByEmail = `(select id from auth.users where lower(email) = lower($1))`;

test("아이디 찾기: 이름 + 휴대폰 → 가입 이메일 표시", async ({ page }) => {
  const email = await signUpAndOnboard(page);

  // 더미 이름/휴대폰(검증유저/010-1234-5678)은 여러 e2e 계정이 공유하므로
  // 이 계정만의 고유 이름·휴대폰으로 갱신해 (이름,휴대폰) 쌍을 유일하게 만든다.
  const uname = `찾기유저${Date.now()}`;
  const uphone = `+82109${String(Date.now()).slice(-7)}`;
  await dbQuery(
    `update public.profiles set name=$1, phone=$2
     where user_id = (select id from auth.users where lower(email) = lower($3))`,
    [uname, uphone, email],
  );

  await page.goto("/find-id", { waitUntil: "networkidle" });
  await page.fill("#name", uname);
  await page.fill("#phone", uphone);
  await page.getByRole("button", { name: "아이디 찾기" }).click();

  await expect(page.getByTestId("found-email")).toHaveText(email, {
    timeout: 15_000,
  });
});

test("아이디 찾기: 일치 정보 없으면 안내", async ({ page }) => {
  await page.goto("/find-id", { waitUntil: "networkidle" });
  await page.fill("#name", `없는사람${Date.now()}`);
  await page.fill("#phone", "010-0000-0000");
  await page.getByRole("button", { name: "아이디 찾기" }).click();
  await expect(page.getByTestId("find-id-none")).toBeVisible({ timeout: 15_000 });
});

test("비밀번호 찾기: 이메일 + 휴대폰 인증 후 새 비번 직접 설정 → 새 비번으로 로그인", async ({
  page,
  browser,
}) => {
  const email = await signUpAndOnboard(page);
  // 가입 시 휴대폰은 +821012345678(010-1234-5678). 이메일은 고유하므로 매칭 충돌 없음.
  const NEWPW = "resetpw99887";

  await page.goto("/find-password", { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#phone", "010-1234-5678");
  // 로컬에선 OTP 를 건너뛰고 바로 새 비번 단계로.
  await page.getByRole("button", { name: "다음" }).click();
  await page.fill("#new-password", NEWPW);
  await page.fill("#confirm-password", NEWPW);
  await page.getByRole("button", { name: "비밀번호 변경" }).click();

  await expect(page.getByTestId("find-pw-done")).toBeVisible({ timeout: 15_000 });

  // 본인이 정한 비번이므로 강제변경 플래그는 꺼져 있어야 한다.
  const rows = await dbQuery<{ f: boolean }>(
    `select must_change_password as f from public.profiles where user_id=${uidByEmail}`,
    [email],
  );
  expect(rows[0]?.f).toBe(false);

  // 새 비밀번호로 실제 로그인되는지 확인(새 컨텍스트).
  const cctx = await browser.newContext();
  const cpage = await cctx.newPage();
  await cpage.goto("/login", { waitUntil: "networkidle" });
  await cpage.fill("#email", email);
  await cpage.fill("#password", NEWPW);
  await cpage.getByRole("button", { name: "로그인" }).last().click();
  await cpage.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), {
    timeout: 30_000,
  });
  await cctx.close();
});
