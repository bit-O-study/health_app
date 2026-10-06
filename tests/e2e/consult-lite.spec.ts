import { expect, test } from "@playwright/test";

import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 2026-10-05 병합 — 990원은 라이트 하나(운영자 상담함 포함). AI 요금제는 3,990원 '오픈 준비 중' 한 줄.
 * 구독 전엔 상담함 버튼이 없고(누를 수 없는 버튼을 켜 두지 않는다), 라이트가 되면 짧은 '상담함' 버튼이 생긴다.
 */
test("구독 화면: 라이트만 카드, AI 요금제는 한 줄, 상담함은 구독자에게만 → 상담 보내기", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(180_000);
  await silenceDevOverlay(page);
  const { user_id } = await createTestAccount(page.context(), baseURL!, false);

  await page.goto("/settings/subscription", { waitUntil: "networkidle" });
  await expect(page.getByTestId("plan-lite")).toContainText("월 990원", { timeout: 20_000 });
  await expect(page.getByTestId("plan-ai-soon")).toContainText("3,990원 · 오픈 준비 중");
  await expect(page.getByTestId("plan-basic")).toHaveCount(0);
  await expect(page.getByTestId("open-consult")).toHaveCount(0);
  await expect(page.getByText("AI 코치 분석")).toHaveCount(0); // AI 한도 표 없음
  await page.screenshot({ path: "scripts/.verify-shots/subscription-free.png", fullPage: true });

  // 구독 전 상담함 주소로 바로 와도 보내기 칸은 없다.
  await page.goto("/coach/manual", { waitUntil: "networkidle" });
  await expect(page.getByText("상담함은 라이트(월 990원)에서 쓸 수 있어요")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "보내기" })).toHaveCount(0);

  await dbQuery(
    `insert into public.subscriptions (user_id, platform, product_id, purchase_token, state, expires_at, auto_renewing)
     values ($1, 'google_play', 'helssu_lite_monthly', gen_random_uuid()::text, 'active', now() + interval '20 days', true)`,
    [user_id],
  );
  await page.goto("/settings/subscription", { waitUntil: "networkidle" });
  const consult = page.getByTestId("open-consult");
  await expect(consult).toHaveText("상담함", { timeout: 20_000 });
  await page.screenshot({ path: "scripts/.verify-shots/subscription-lite.png", fullPage: true });
  await consult.click();
  await page.waitForURL("**/coach/manual", { timeout: 20_000 });

  await page.getByRole("tab", { name: "상담" }).click();
  await page.getByLabel("상담할 내용").fill("벤치프레스가 3주째 그대로예요. 어떻게 바꾸면 좋을까요?");
  await page.screenshot({ path: "scripts/.verify-shots/consult-form.png", fullPage: true });
  await page.getByRole("button", { name: "보내기" }).click();
  await expect(page.getByRole("status")).toHaveText("보냈어요. 답이 오면 아래에 보여요.", { timeout: 30_000 });
  await expect(page.getByText("답변 대기").first()).toBeVisible({ timeout: 20_000 });
  const rows = await dbQuery<{ kind: string }>(`select kind from public.manual_coach_requests where user_id=$1`, [user_id]);
  expect(rows).toEqual([{ kind: "consultation" }]);
});
