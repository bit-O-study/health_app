import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 회원탈퇴(소프트 자가탈퇴) + 관리자 대시보드.

test("회원탈퇴: 설정 → 탈퇴 → 로그인화면 + withdrawn_at 기록", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 회원탈퇴는 마이페이지(설정 > 마이페이지) 하단으로 이동됨.
  await page.goto("/settings/me", { waitUntil: "networkidle" });
  await page.getByTestId("withdraw-account").click();
  // 설문: 이유 선택 → 다음
  await page.getByText("운동을 더 이상 하지 않아요").click();
  await page.getByRole("button", { name: "다음" }).click();
  // 감수 체크 → 탈퇴하기
  await page.getByRole("checkbox").check();
  await page.getByTestId("withdraw-confirm").click();

  // 탈퇴 후 로그아웃 → 로그인 화면
  await page.waitForURL(/\/login$/, { timeout: 30_000 });

  // DB 에 withdrawn_at 기록됨
  const uid = `(select id from auth.users where lower(email)=lower($1))`;
  const rows = await dbQuery<{ withdrawn_at: string | null }>(
    `select withdrawn_at from public.profiles where user_id=${uid}`,
    [email],
  );
  expect(rows[0].withdrawn_at).not.toBeNull();
});

test("관리자 대시보드: 사이드바 메뉴 + 4지표 차트 + 일/월/연 토글", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await dbQuery(
    `insert into public.admins(email) values($1) on conflict (email) do nothing`,
    [email.toLowerCase()],
  );

  await page.goto("/admin", { waitUntil: "networkidle" });

  // 대시보드 + 사이드바 메뉴(기존 메뉴 포함)
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
  await expect(page.getByRole("link", { name: "회원정보" })).toBeVisible();
  await expect(page.getByRole("link", { name: "관리자 설정" })).toBeVisible();

  // 헤드라인 카드 + 4개 지표 차트 제목
  await expect(page.getByText("전체 회원수")).toBeVisible();
  await expect(page.getByRole("heading", { name: "회원가입수" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "회원탈퇴수" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "접속유저수" })).toBeVisible();

  // 일/월/연 토글
  await expect(page.getByTestId("gran-day")).toBeVisible();
  await expect(page.getByTestId("gran-month")).toBeVisible();
  await page.getByTestId("gran-year").click();
});