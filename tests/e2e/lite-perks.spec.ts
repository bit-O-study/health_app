import { expect, test } from "@playwright/test";

import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 라이트(990원) 혜택 1단계(2026-10-02) — 리포트 4종 · 홈 배너 없음 · 커뮤니티 라이트 배지 · 새 기능 먼저(라이트 먼저).
 * 같은 계정으로 무료일 때와 라이트가 된 뒤를 비교한다.
 */
const LITE_SUB = `insert into public.subscriptions (user_id, platform, product_id, purchase_token, state, expires_at, auto_renewing)
  values ($1, 'google_play', 'helssu_lite_monthly', gen_random_uuid()::text, 'active', now() + interval '20 days', true)`;

test("라이트: 맞춤 운동 리포트 탭에 체성분·컨디션·식단·수분/걸음 리포트가 보이고 홈 배너가 없다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  await silenceDevOverlay(page);
  const { user_id } = await createTestAccount(page.context(), baseURL!, false);

  // 무료: 홈 배너가 있다(대조).
  await page.goto("/home", { waitUntil: "networkidle" });
  await expect(page.getByRole("region", { name: "함께하는 서비스" })).toBeVisible({ timeout: 15_000 });

  // 기록 심기 — 체성분 2번, 오늘 컨디션, 오늘 식단, 오늘 물.
  await dbQuery(
    `insert into public.body_compositions (user_id, measured_at, weight_kg, skeletal_muscle_kg, body_fat_kg, body_fat_pct)
     values ($1, (now() at time zone 'Asia/Seoul')::date - 30, 76, 31.0, 16.0, 21.0),
            ($1, (now() at time zone 'Asia/Seoul')::date, 75, 31.8, 15.0, 20.0)`,
    [user_id],
  );
  await dbQuery(
    `insert into public.daily_checkins (user_id, for_date, sleep, soreness, energy)
     values ($1, (now() at time zone 'Asia/Seoul')::date, 1, 3, 2)`,
    [user_id],
  );
  await dbQuery(
    `insert into public.food_logs (user_id, for_date, meal, name, kcal, protein_g, carbs_g, fat_g)
     values ($1, (now() at time zone 'Asia/Seoul')::date, 'lunch', '닭가슴살 도시락', 520, 45, 50, 12)`,
    [user_id],
  );
  await dbQuery(
    `insert into public.water_logs (user_id, for_date, ml) values ($1, (now() at time zone 'Asia/Seoul')::date, 1500)`,
    [user_id],
  );
  await dbQuery(LITE_SUB, [user_id]);

  await page.goto("/fit?tab=report", { waitUntil: "networkidle" });
  const body = page.getByTestId("lite-report-body");
  await expect(body).toContainText("측정 2번", { timeout: 15_000 });
  await expect(page.getByTestId("lite-body-muscleKg")).toContainText("31.8kg");
  await expect(page.getByTestId("lite-body-muscleKg")).toContainText("지난번 +0.8");
  await expect(page.getByTestId("lite-body-fatKg")).toContainText("지난번 −1");
  await expect(page.getByTestId("lite-report-condition")).toContainText("안 좋음 1일");
  await expect(page.getByTestId("lite-report-condition")).toContainText("가장 자주 나빴던 건 잠");
  await expect(page.getByTestId("lite-report-diet")).toContainText("기록한 날1일");
  await expect(page.getByTestId("lite-report-diet")).toContainText("닭가슴살 도시락 1번");
  await expect(page.getByTestId("lite-report-habits")).toContainText("1,500ml");
  await page.screenshot({ path: "scripts/.verify-shots/lite-reports.png", fullPage: true });

  // 라이트: 홈 배너 없음.
  await page.goto("/home", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 }).or(page.getByRole("link", { name: /(짐꾼|헬쑤) 홈/ })).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "함께하는 서비스" })).toHaveCount(0);
});

test("라이트: 커뮤니티 이름 옆 배지, '라이트 먼저' 기능은 라이트에게 먼저 열린다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  await silenceDevOverlay(page);
  const { user_id } = await createTestAccount(page.context(), baseURL!, false);
  const caption = `라이트 배지 확인 ${Date.now()}`;
  await dbQuery(
    `insert into public.community_posts(user_id, visibility, author_name, photo_url, caption)
     values($1, 'public', '검증유저', 'https://example.com/e2e.png', $2)`,
    [user_id, caption],
  );
  const before = await dbQuery<{ value: unknown }>(`select value from public.app_settings where key = 'debug.pet'`);
  try {
    await dbQuery(
      `insert into public.app_settings(key, value, updated_at) values ('debug.pet', '"lite"'::jsonb, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
    );

    // 무료: 배지 없음 · 펫(라이트 먼저)은 홈으로 돌려보낸다.
    await page.goto("/community", { waitUntil: "networkidle" });
    const post = page.locator("article, li, div").filter({ hasText: caption }).last();
    await expect(post).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("author-lite-badge")).toHaveCount(0);
    await page.goto("/pet");
    await expect(page).toHaveURL((u) => u.pathname === "/home", { timeout: 15_000 });

    await dbQuery(LITE_SUB, [user_id]);

    await page.goto("/community", { waitUntil: "networkidle" });
    await expect(page.getByTestId("author-lite-badge").first()).toHaveText("라이트", { timeout: 15_000 });
    await page.goto("/pet");
    await expect(page).toHaveURL((u) => u.pathname === "/pet", { timeout: 15_000 });
  } finally {
    if (before.length) {
      await dbQuery(`update public.app_settings set value = $1::jsonb where key = 'debug.pet'`, [JSON.stringify(before[0].value)]);
    } else {
      await dbQuery(`delete from public.app_settings where key = 'debug.pet'`);
    }
  }
});
