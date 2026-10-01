import { expect, test } from "@playwright/test";

import { createOnboardedAccount, signUpAndOnboard } from "./helpers/auth";
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
  productId = "helssu_premium_monthly",
) {
  await dbQuery(
    `insert into public.subscriptions
       (user_id, platform, product_id, purchase_token, state, expires_at, auto_renewing)
     values (${uid}, 'google_play', $3, gen_random_uuid()::text, $2, ${expiresSql}, true)
     on conflict (user_id) do update
       set state = excluded.state, expires_at = excluded.expires_at, product_id = excluded.product_id`,
    [email, state, productId],
  );
}

test("구독 화면에 무료·프리미엄 한도가 숫자로 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await createOnboardedAccount(page);

  await page.goto("/settings", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /구독/ }).first().click();
  await expect(page.getByRole("heading", { name: "구독", level: 1 })).toBeVisible({
    timeout: 10_000,
  });

  // 낼 만한지 판단하려면 숫자가 보여야 한다.
  await expect(page.getByText("한 달에 쓸 수 있는 AI 횟수")).toBeVisible();
  await expect(page.getByText("식단 사진 분석", { exact: true })).toBeVisible();
  await expect(page.getByText("100", { exact: true }).first()).toBeVisible();

  // 요금제 세 개가 가격과 함께 보이고, 아직 없는 혜택은 '곧 제공'이라고 밝힌다(2026-09-30).
  await expect(page.getByTestId("plan-lite")).toContainText("월 990원");
  await expect(page.getByTestId("plan-basic")).toContainText("월 3,900원");
  await expect(page.getByTestId("plan-plus")).toContainText("월 6,900원");
  await expect(page.getByTestId("plan-pro")).toContainText("월 9,900원");
  await expect(page.getByTestId("plan-pro")).toContainText("곧 제공");

  // 아직 아무것도 안 샀으면 무료.
  const status = page.getByTestId("subscription-status");
  await expect(status).toHaveAttribute("data-premium", "0");
  await expect(status).toContainText("무료");
});

test("결제 설정이 안 됐으면 오류가 아니라 '준비 중'으로 안내한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await createOnboardedAccount(page);

  await page.goto("/settings/subscription", { waitUntil: "networkidle" });
  // 설정이 안 된 걸 오류로 보여주면 사용자가 자기 잘못인 줄 안다.
  await expect(page.getByTestId("subscription-not-ready")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("subscribe-basic")).toHaveCount(0);
});

test("기간이 남은 3,900원 구독은 베이직으로 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedSubscription(email, "active", "now() + interval '20 days'");

  await page.goto("/settings/subscription", { waitUntil: "networkidle" });
  const status = page.getByTestId("subscription-status");
  await expect(status).toHaveAttribute("data-premium", "1", { timeout: 10_000 });
  await expect(status).toHaveAttribute("data-plan", "basic");
  await expect(status).toContainText("베이직");
  await expect(page.getByTestId("plan-basic")).toContainText("이용 중");
});

test("플러스 상품을 구독하면 플러스", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedSubscription(email, "active", "now() + interval '20 days'", "helssu_plus_monthly");

  await page.goto("/settings/subscription", { waitUntil: "networkidle" });
  const status = page.getByTestId("subscription-status");
  await expect(status).toHaveAttribute("data-plan", "plus", { timeout: 10_000 });
  await expect(status).toContainText("플러스");
});

test("정액권이 살아 있는 트레이너에 연결된 회원은 플러스", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const trainer = await signUpAndOnboard(page);
  await page.context().clearCookies();
  const member = await signUpAndOnboard(page);
  await dbQuery(
    `insert into pt_passes(trainer_id,name,phone,status,starts_on,ends_on)
     select id,'요금제 검증','01012345678','active',current_date-1,current_date+30 from auth.users where lower(email)=lower($1)`,
    [trainer],
  );
  await dbQuery(
    `insert into pt_links(trainer_id,member_id,member_name)
     values ((select id from auth.users where lower(email)=lower($1)), ${uid.replace("$1", "$2")}, '요금제 회원')`,
    [trainer, member],
  );

  await page.goto("/settings/subscription", { waitUntil: "networkidle" });
  const status = page.getByTestId("subscription-status");
  await expect(status).toHaveAttribute("data-plan", "plus", { timeout: 10_000 });
  await expect(status).toContainText("트레이너·팀 이용권");

  // 🔴 트레이너 정액권이 끝나면 회원도 무료로 돌아간다.
  await dbQuery(
    `update pt_passes set status='canceled' where trainer_id=(select id from auth.users where lower(email)=lower($1))`,
    [trainer],
  );
  await page.reload({ waitUntil: "networkidle" });
  await expect(status).toHaveAttribute("data-plan", "free", { timeout: 10_000 });
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
  await expect(status).toHaveAttribute("data-membership", "ending");
  await expect(status).toContainText("이용하고 끝나요");
  // 이미 해지했으면 해지 버튼은 다시 안 보인다.
  await expect(page.getByTestId("membership-cancel")).toHaveCount(0);
});

test("배민클럽처럼: 멤버십 카드에 다음 결제일, 해지는 안내 후 구글 플레이로", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedSubscription(email, "active", "now() + interval '20 days'", "helssu_plus_monthly");

  await page.goto("/settings/subscription", { waitUntil: "networkidle" });
  const status = page.getByTestId("subscription-status");
  await expect(status).toHaveAttribute("data-membership", "renewing", { timeout: 10_000 });
  await expect(status).toContainText("플러스 멤버십");
  await expect(status).toContainText("다음 결제");
  await expect(status).toContainText("월 6,900원");
  await expect(page.getByTestId("membership-manage")).toHaveAttribute("href", /play\.google\.com\/store\/account\/subscriptions/);

  // 해지하기 → 바로 끊지 않고 안내: 언제까지 쓰는지 + 한 단계 낮은 요금제 제안.
  await page.getByTestId("membership-cancel").click();
  const sheet = page.getByTestId("cancel-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("까지는 지금처럼 쓸 수 있고");
  await expect(page.getByTestId("cancel-downgrade")).toContainText("베이직");
  await expect(page.getByTestId("cancel-go-play")).toHaveAttribute("href", /play\.google\.com/);
  await sheet.getByRole("button", { name: "계속 이용할게요" }).click();
  await expect(sheet).toHaveCount(0);
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
