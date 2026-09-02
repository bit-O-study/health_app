import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 구독(구글 플레이 인앱결제) — 로드맵 7.1.
//
// 실제 결제는 E2E 로 못 돈다(구글 결제창·실기기). 여기서 지키는 것은 **약속**이다.
//  ① 결제 설정이 안 된 환경에서 사용자에게 오류를 던지지 않는다(우리 사정이다)
//  ② 무엇이 달라지는지 **숫자로** 보인다 — "더 많이" 로는 낼 만한지 판단할 수 없다
//  ③ 🔴 DB 에 구독 행이 있어도, **만료가 지났으면** 프리미엄이 아니다

const uid = `(select id from auth.users where lower(email)=lower($1))`;

/** 구독 행을 직접 넣는다 — 서버가 구글에 물어본 결과를 흉내 낸다. */
async function seedSubscription(
  email: string,
  state: string,
  expiresSql: string,
) {
  await dbQuery(
    `insert into public.subscriptions
       (user_id, platform, product_id, purchase_token, state, expires_at, auto_renewing)
     values (${uid}, 'google_play', 'helssu_premium_monthly', gen_random_uuid()::text, $2, ${expiresSql}, true)
     on conflict (user_id) do update
       set state = excluded.state, expires_at = excluded.expires_at`,
    [email, state],
  );
}

test("구독 화면에 무료·프리미엄 한도가 숫자로 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/settings", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /구독/ }).first().click();
  await expect(page.getByRole("heading", { name: "구독", level: 1 })).toBeVisible({
    timeout: 10_000,
  });

  // 낼 만한지 판단하려면 숫자가 보여야 한다.
  await expect(page.getByText("한 달에 쓸 수 있는 횟수")).toBeVisible();
  await expect(page.getByText("식단 사진 분석")).toBeVisible();
  await expect(page.getByText("100", { exact: true }).first()).toBeVisible();

  // 아직 아무것도 안 샀으면 무료.
  const status = page.getByTestId("subscription-status");
  await expect(status).toHaveAttribute("data-premium", "0");
  await expect(status).toContainText("무료");
});

test("결제 설정이 안 됐으면 오류가 아니라 '준비 중'으로 안내한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/settings/subscription", { waitUntil: "networkidle" });
  // 설정이 안 된 걸 오류로 보여주면 사용자가 자기 잘못인 줄 안다.
  await expect(page.getByTestId("subscription-not-ready")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("subscribe-button")).toHaveCount(0);
});

test("기간이 남은 구독은 프리미엄으로 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedSubscription(email, "active", "now() + interval '20 days'");

  await page.goto("/settings/subscription", { waitUntil: "networkidle" });
  const status = page.getByTestId("subscription-status");
  await expect(status).toHaveAttribute("data-premium", "1", { timeout: 10_000 });
  await expect(status).toContainText("프리미엄");
});

test("🔴 만료가 지났으면 'active' 로 남아 있어도 프리미엄이 아니다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  // 갱신 소식을 놓쳐 기록이 낡은 채로 남아 있는 상황.
  await seedSubscription(email, "active", "now() - interval '1 day'");

  await page.goto("/settings/subscription", { waitUntil: "networkidle" });
  const status = page.getByTestId("subscription-status");
  await expect(status).toHaveAttribute("data-premium", "0", { timeout: 10_000 });
  await expect(status).toContainText("무료");
});

test("해지해도 남은 기간까지는 프리미엄", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedSubscription(email, "canceled", "now() + interval '5 days'");

  await page.goto("/settings/subscription", { waitUntil: "networkidle" });
  const status = page.getByTestId("subscription-status");
  await expect(status).toHaveAttribute("data-premium", "1", { timeout: 10_000 });
  await expect(status).toContainText("해지 예정");
});

test("🔴 같은 구매 토큰을 다른 계정이 가져갈 수 없다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const first = await signUpAndOnboard(page);
  await dbQuery(
    `insert into public.subscriptions
       (user_id, platform, product_id, purchase_token, state, expires_at, auto_renewing)
     values (${uid}, 'google_play', 'helssu_premium_monthly', 'shared-token-e2e', 'active', now() + interval '10 days', true)
     on conflict (user_id) do update set purchase_token = excluded.purchase_token`,
    [first],
  );

  // 두 번째 계정으로 갈아탄다 — 로그인 상태로 회원가입 화면에 가면 튕긴다.
  await page.context().clearCookies();
  const second = await signUpAndOnboard(page);
  // 같은 토큰으로 두 번째 계정에 넣으려 하면 유니크 제약이 막아야 한다.
  await expect(
    dbQuery(
      `insert into public.subscriptions
         (user_id, platform, product_id, purchase_token, state, expires_at, auto_renewing)
       values (${uid}, 'google_play', 'helssu_premium_monthly', 'shared-token-e2e', 'active', now() + interval '10 days', true)`,
      [second],
    ),
  ).rejects.toThrow();
});

test("로그인 안 하면 로그인으로 보낸다", async ({ page }) => {
  await page.goto("/settings/subscription", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/login/);
});
