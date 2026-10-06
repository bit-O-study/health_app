import { expect, test } from "@playwright/test";

import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 990원 라이트엔 AI 가 없다(2026-10-01 사용자 결정). 나머지(AI) 요금제는 아직 준비 중.
 * - 구독 화면: 라이트 카드에 'AI 없음 · 나머지 준비 중' 안내, 베이직·플러스·프로는 '오픈 준비 중'.
 * - 체성분: 사진은 올릴 수 있지만 'AI 자동 추출' 버튼이 없고 준비 중 안내가 보인다.
 * - 지금은 AI 자체를 안 연다(AI_OPEN=false) — 무료 회원도 맛보기 없이 같은 안내.
 */
test("무료·라이트 모두 AI 버튼이 없고, 나머지 요금제는 준비 중이라고 안내한다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  await silenceDevOverlay(page);
  const { user_id } = await createTestAccount(page.context(), baseURL!, false);

  // 지금은 AI 를 아예 열지 않는다(AI_OPEN=false) — 무료 회원도 맛보기 없이 같은 안내.
  await page.goto("/settings/body-composition", { waitUntil: "networkidle" });
  await expect(page.getByTestId("body-comp-no-ai")).toContainText("아직 준비 중", { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "사진에서 자동 추출" })).toHaveCount(0);

  await dbQuery(
    `insert into public.subscriptions (user_id, platform, product_id, purchase_token, state, expires_at, auto_renewing)
     values ($1, 'google_play', 'helssu_lite_monthly', gen_random_uuid()::text, 'active', now() + interval '20 days', true)`,
    [user_id],
  );

  await page.goto("/settings/body-composition", { waitUntil: "networkidle" });
  await expect(page.getByTestId("body-comp-no-ai")).toContainText("준비 중", { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "사진에서 자동 추출" })).toHaveCount(0);

  await page.goto("/settings/subscription", { waitUntil: "networkidle" });
  await expect(page.getByTestId("plan-lite-note")).toContainText("AI 기능은 없어요", { timeout: 15_000 });
  await expect(page.getByTestId("plan-ai-soon")).toContainText("오픈 준비 중");
});
