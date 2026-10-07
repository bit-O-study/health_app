import { expect, test } from "@playwright/test";

import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 990원 라이트엔 AI 가 없다(2026-10-01 사용자 결정). 나머지(AI) 요금제는 아직 준비 중.
 * - 구독 화면: 라이트 카드에 'AI 없음 · 나머지 준비 중' 안내, 베이직·플러스·프로는 '오픈 준비 중'.
 * - 체성분(웹): 사진은 올릴 수 있지만 자동 추출 버튼이 없고 '앱에서 돼요' 안내가 보인다.
 *   앱(1.0.6~)은 AI 없이 폰 안 글자 인식으로 읽는다(2026-10-07) — 아래 두 번째 테스트.
 * - 지금은 AI 자체를 안 연다(AI_OPEN=false) — 무료 회원도 맛보기 없이 같은 안내.
 */
test("무료·라이트 모두 AI 버튼이 없고, 나머지 요금제는 준비 중이라고 안내한다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  await silenceDevOverlay(page);
  const { user_id } = await createTestAccount(page.context(), baseURL!, false);

  // 지금은 AI 를 아예 열지 않는다(AI_OPEN=false) — 무료 회원도 맛보기 없이 같은 안내.
  await page.goto("/settings/body-composition", { waitUntil: "networkidle" });
  await expect(page.getByTestId("body-comp-no-ai")).toContainText("앱에서 돼요", { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "사진에서 자동 추출" })).toHaveCount(0);

  await dbQuery(
    `insert into public.subscriptions (user_id, platform, product_id, purchase_token, state, expires_at, auto_renewing)
     values ($1, 'google_play', 'helssu_lite_monthly', gen_random_uuid()::text, 'active', now() + interval '20 days', true)`,
    [user_id],
  );

  await page.goto("/settings/body-composition", { waitUntil: "networkidle" });
  await expect(page.getByTestId("body-comp-no-ai")).toContainText("앱에서 돼요", { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "사진에서 자동 추출" })).toHaveCount(0);

  await page.goto("/settings/subscription", { waitUntil: "networkidle" });
  await expect(page.getByTestId("plan-lite-note")).toContainText("AI 기능은 없어요", { timeout: 15_000 });
  await expect(page.getByTestId("plan-ai-soon")).toContainText("오픈 준비 중");
});

/** 1x1 PNG — 사진 고르기·축소 경로만 지나가면 된다(글자는 가짜 플러그인이 준다). */
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test("앱에선 AI 없이 폰 안 글자 인식으로 분석지 숫자를 채운다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  await silenceDevOverlay(page);
  await createTestAccount(page.context(), baseURL!, false);
  // 앱의 BodyCompOcr 플러그인 흉내 — ML Kit 가 주는 모양(단어 + 위치)으로 체중·골격근·체지방 4줄.
  await page.addInitScript(() => {
    const word = (text: string, left: number, top: number) => ({ text, left, top, right: left + 60, bottom: top + 20 });
    (window as unknown as { Capacitor: unknown }).Capacitor = {
      isPluginAvailable: (name: string) => name === "BodyCompOcr",
      Plugins: {
        BodyCompOcr: {
          recognize: async () => ({
            words: [
              word("체중", 0, 0), word("Weight", 80, 0), word("70.0", 400, 0), word("(55.0~74.4)", 480, 0),
              word("골격근량", 0, 40), word("SMM", 80, 40), word("30.5", 400, 40),
              word("체지방량", 0, 80), word("14.0", 400, 80),
              word("체지방률", 0, 120), word("PBF", 80, 120), word("20.0", 400, 120),
            ],
          }),
        },
      },
    };
  });

  await page.goto("/settings/body-composition", { waitUntil: "networkidle" });
  await expect(page.getByTestId("body-comp-no-ai")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByText("이 폰 안에서 읽어 외부로 보내지 않아요")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: "inbody.png", mimeType: "image/png", buffer: PNG_1PX });
  const button = page.getByRole("button", { name: "사진에서 자동 추출" });
  await expect(button).toBeEnabled({ timeout: 15_000 });
  await button.click();
  await expect(page.getByText("4개 항목을 읽어 채웠습니다")).toBeVisible({ timeout: 15_000 });
  const field = (label: string) => page.locator("label", { hasText: label }).first().locator("input");
  await expect(field("체중 (kg)")).toHaveValue("70");
  await expect(field("골격근량 (kg)")).toHaveValue("30.5");
  await expect(field("체지방량 (kg)")).toHaveValue("14");
  await expect(field("체지방률 (%)")).toHaveValue("20");
});
