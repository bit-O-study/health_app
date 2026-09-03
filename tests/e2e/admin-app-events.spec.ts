import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb, openAuthenticatedDbClient } from "./helpers/db";

// 관리자 콘솔의 "실사용 오류" 탭 — 프로덕션에서 무슨 일이 나는지 보는 화면(로드맵 1.3).
// 지금까지는 "폰에서 팅긴다"는 말만 있고 근거가 없었다. 종류·화면·버전·기기 네 축으로
// 나눠 봐야 특정 기기인지, 특정 배포부터인지, 특정 화면에서만인지가 갈린다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;

async function signUpAsAdmin(page: Parameters<typeof signUpAndOnboard>[0]) {
  const email = await signUpAndOnboard(page);
  await dbQuery(
    `insert into public.admins(email) values($1) on conflict (email) do nothing`,
    [email.toLowerCase()],
  );
  return email;
}

test("관리자 네비에서 들어가지고 수집 안내가 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAsAdmin(page);

  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "실사용 오류" }).click();
  await expect(page).toHaveURL(/\/admin\/events$/);
  await expect(page.getByRole("heading", { name: "실사용 오류" })).toBeVisible();
  // 무엇을 수집하지 '않는지' 를 화면에 명시한다 — 관측이 사찰이 되면 안 된다.
  await expect(page.getByText(/이메일·토큰·식별자가 남지 않습니다/)).toBeVisible();
  // '기록 없음' 분기는 여기서 못 본다 — E2E 로 화면을 도는 것만으로 느린 화면
  // 경고가 실제로 쌓이기 때문(수집이 도는 증거이기도 하다). 빈 화면 렌더는
  // summarizeAppEvents([]) 단위 테스트가 맡는다.
});

test("기록이 있으면 종류·화면·버전·기기별 집계와 최근 발생이 보인다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAsAdmin(page);

  const marker = `e2e 팅김 ${Date.now()}`;
  await dbQuery(
    `insert into public.app_events
       (user_id, kind, severity, route, message, app_version, platform, device, value, count, occurred_at)
     values
       (${uid}, 'webview_recovery', 'error', '/plan/today', $2, '1.0.3', 'android', 'Android 14 · SM-S911N', 2, 3, now()),
       (${uid}, 'slow_route', 'warn', '/routine', '첫 로딩 6200ms', '1.0.3', 'android', 'Android 14 · SM-S911N', 6200, 1, now())`,
    [email, marker],
  );

  try {
    await page.goto("/admin/events", { waitUntil: "networkidle" });

    // count 를 합산해 센다 — 반복(count=3)을 1건으로 세면 심각도를 놓친다.
    // (전체 수는 E2E 가 도는 동안 쌓이는 '느린 화면' 경고가 섞이므로, 이 사건의
    //  묶음 값으로 확인한다.)
    const kindRow = page
      .locator("li", { hasText: "WebView 종료 후 복구" })
      .first();
    await expect(kindRow).toContainText("3건");
    await expect(kindRow).toContainText("오류 3");

    // 네 축이 모두 있어야 원인이 좁혀진다.
    await expect(page.getByRole("heading", { name: "종류별" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "화면별" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /버전별/ }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "기기별" })).toBeVisible();

    await expect(page.getByText("WebView 종료 후 복구").first()).toBeVisible();
    await expect(page.getByText("/plan/today").first()).toBeVisible();
    await expect(page.getByText("android · 1.0.3").first()).toBeVisible();
    await expect(
      page.getByText("Android 14 · SM-S911N").first(),
    ).toBeVisible();
    await expect(page.getByText(marker).first()).toBeVisible();
  } finally {
    await dbQuery(`delete from public.app_events where user_id = ${uid}`, [email]);
  }
});

test("관리자가 아니면 실사용 오류 화면에 못 들어간다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page); // admins 에 넣지 않는다

  const res = await page.request.get("/admin/events", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toContain("/");

  await page.goto("/admin/events", { waitUntil: "networkidle" });
  await expect(page).not.toHaveURL(/\/admin\/events$/);
  await expect(page.getByRole("heading", { name: "실사용 오류" })).toHaveCount(0);
});

test("일반 사용자는 자기 것만 남길 수 있고 남의 이름으로는 못 쌓는다(RLS)", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 관측 입구가 열려 있으면 그게 구멍이다 — 정책이 실제로 막는지 DB 권한으로 확인한다.
  // 사용자 권한으로는 auth.users 를 못 읽는다 — id 는 서비스 롤로 먼저 구한다.
  const [me] = await dbQuery<{ id: string }>(
    `select id::text from auth.users where lower(email)=lower($1)`,
    [email],
  );
  const client = await openAuthenticatedDbClient(email, "app-events-rls");
  try {
    // 자기 것: 통과.
    await client.query(
      `insert into public.app_events (user_id, kind) values ($1::uuid, 'save_failure')`,
      [me.id],
    );
    // 남의 것: RLS 가 막는다.
    const other = "00000000-0000-4000-8000-000000000000";
    await expect(
      client.query(
        `insert into public.app_events (user_id, kind) values ($1::uuid, 'save_failure')`,
        [other],
      ),
    ).rejects.toThrow(/row-level security|violates/i);
  } finally {
    await client.query("rollback");
    await client.end();
  }
});
