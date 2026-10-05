import { expect, test } from "@playwright/test";

import { signUpAndOnboardViaUI } from "./helpers/auth";
import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 가입 설문 3문항 + 몸 목표 스타일(2026-10-01).
 * - 가입: 목표 다음 단계에서 나이대·스타일(성별 기본값 미리 선택)·1회 시간을 고른다.
 * - 설정 › 맞춤 운동 설정: 기존 회원이 바꾼다 → 맞춤 운동 앱의 목표 비율·추천 개수가 따라온다.
 */
test("가입 설문에서 나이대·몸 목표 스타일·1회 시간이 저장된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  await silenceDevOverlay(page);
  const email = await signUpAndOnboardViaUI(page); // 30대 · 스타일 기본(남→상체 위주) · 45분
  const rows = await dbQuery<{ age_group: string; body_style: string; session_minutes: number }>(
    `select age_group, body_style, session_minutes from public.profiles
       where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email],
  );
  expect(rows[0]).toEqual({ age_group: "30s", body_style: "upper", session_minutes: 45 });
});

test("설정에서 하체 위주·60분으로 바꾸면 맞춤 운동이 따라온다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  await silenceDevOverlay(page);
  const { email, user_id } = await createTestAccount(page.context(), baseURL!, false);
  await dbQuery(
    `insert into public.subscriptions (user_id, platform, product_id, purchase_token, state, expires_at, auto_renewing)
     values ($1, 'google_play', 'helssu_lite_monthly', gen_random_uuid()::text, 'active', now() + interval '20 days', true)`,
    [user_id],
  );

  await page.goto("/settings/fit", { waitUntil: "networkidle" });
  const form = page.getByTestId("survey-extra-form");
  await form.getByRole("group", { name: "나이대" }).getByRole("button", { name: "40대" }).click();
  await form.getByRole("group", { name: "몸 목표 스타일" }).getByRole("button", { name: /하체 위주/ }).click();
  await form.getByRole("group", { name: "1회 운동 시간" }).getByRole("button", { name: "60분 이상" }).click();
  await form.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("status")).toHaveText("저장했어요.", { timeout: 15_000 });
  const rows = await dbQuery<{ age_group: string; body_style: string; session_minutes: number }>(
    `select age_group, body_style, session_minutes from public.profiles where user_id=$1`,
    [user_id],
  );
  expect(rows[0]).toEqual({ age_group: "40s", body_style: "lower", session_minutes: 60 });
  expect(email).toBeTruthy();

  // 맞춤 운동: 하체 위주 표 · 60분이면 추천 4개.
  await page.goto("/fit", { waitUntil: "networkidle" });
  await expect(page.getByTestId("fit-page")).toContainText("하체 위주", { timeout: 15_000 });
  await expect(page.getByTestId("fit-picks").locator("li")).toHaveCount(4);
  await expect(page.getByTestId("fit-style-change")).toHaveAttribute("href", "/settings/fit");
});
