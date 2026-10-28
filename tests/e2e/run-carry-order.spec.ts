import { expect, test, type Page } from "@playwright/test";

import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 런닝 이어하기 · 운동 순서 정리(2026-10-28, 설계 https://claude.ai/artifact/Q6xK7mJ8RFjjPStSsDmpE3).
 * - 루틴 마무리 런닝은 같은 루틴 행의 지난번 실제 값(25분·9.5·2%)으로 이어진다(무료).
 * - 오늘 운동 관리의 '지난번처럼 달리기'가 이 루틴 일차의 지난 런닝 모드 설정으로 연다(무료).
 * - 가슴 3개 연속 → '순서 정리'. 무료는 잠금, 라이트는 오늘만 적용(루틴 position 그대로) → 되돌리기.
 */
const daysAgo = (today: string, n: number) => new Date(Date.parse(`${today}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

async function setup(page: Page, baseURL: string) {
  await silenceDevOverlay(page);
  const { email, supabase, user_id } = await createTestAccount(page.context(), baseURL, false);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const r = await supabase.from("user_routines").insert({
    user_id, splits: 0, variant_id: "custom",
    custom_week: [["chest", "back"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"]],
    start_date: today, day_index_migrated: true,
  });
  if (r.error) throw r.error;
  await dbQuery(`delete from public.routine_exercises where user_id=$1`, [user_id]);
  await dbQuery(`delete from public.routine_conditioning where user_id=$1`, [user_id]);
  // 가슴 3개가 먼저, 등 2개가 뒤 — 같은 부위 연속 3번.
  await dbQuery(
    `insert into public.routine_exercises (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg) values
       ($1, 0, 'chest', 0, 'bench-press', 'barbell', 4, 8, 60),
       ($1, 0, 'chest', 1, 'incline-dumbbell-bench-press', 'dumbbell', 3, 10, 20),
       ($1, 0, 'chest', 2, 'cable-fly', 'cable', 3, 12, 10),
       ($1, 0, 'back', 0, 'lat-pulldown', 'machine', 4, 10, 50),
       ($1, 0, 'back', 1, 'barbell-row', 'barbell', 4, 8, 50)`,
    [user_id],
  );
  // 마무리 런닝(루틴 값 5분·8km/h·1%) + 일주일 전 이 행으로 실제로 뛴 기록(25분·9.5·2%).
  const [cool] = await dbQuery<{ id: string }>(
    `insert into public.routine_conditioning (user_id, focus, kind, position, item_id, duration_min, speed, incline)
     values ($1, 'chest', 'cooldown', 0, 'running', 5, 8, 1) returning id`,
    [user_id],
  );
  await dbQuery(
    `insert into public.conditioning_completions (user_id, for_date, kind, item_id, source_row_id, status, duration_min, speed, incline)
     values ($1, $2, 'cooldown', 'running', $3, 'done', 25, 9.5, 2)`,
    [user_id, daysAgo(today, 7), cool.id],
  );
  // 일주일 전 같은 루틴 일차(0)에서 실내 5km 를 '마무리로' 뛴 런닝 모드 기록.
  const started = new Date(Date.now() - 7 * 86_400_000).toISOString();
  await dbQuery(
    `insert into public.run_sessions (user_id, client_session_id, for_date, mode, started_at, ended_at, duration_sec, distance_m, routine_day, goal, replaced_routine)
     values ($1, gen_random_uuid(), $2, 'indoor', $3::timestamptz, $3::timestamptz + interval '31 minutes', 1860, 5000, 0, '{"kind":"distance","meters":5000}', false)`,
    [user_id, daysAgo(today, 7), started],
  );
  return { email, user_id, today };
}

async function grantLite(email: string) {
  await dbQuery(
    `insert into public.subscriptions (user_id, platform, product_id, purchase_token, state, expires_at, auto_renewing)
     values ((select id from auth.users where lower(email)=lower($1)), 'google_play', 'helssu_lite_monthly', gen_random_uuid()::text, 'active', now() + interval '20 days', true)`,
    [email],
  );
}

test("무료: 마무리 런닝이 지난번 값으로 이어지고, 지난번처럼 달리기 · 순서 정리는 잠금", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  await setup(page, baseURL!);

  await page.goto("/routine", { waitUntil: "networkidle" });
  const carried = page.getByTestId("cond-carried");
  await expect(carried).toBeVisible({ timeout: 20_000 });
  await expect(carried).toContainText("지난번 그대로");
  await expect(carried).toContainText("25");
  await expect(carried).toContainText("9.5");

  // 순서 정리: 가슴 3개 연속 안내 → 무료는 잠금 화면(결과 숫자까지만).
  await expect(page.getByTestId("order-warn")).toContainText("가슴 운동 3개가 연달아");
  await page.getByTestId("order-organize").click();
  const locked = page.getByTestId("order-locked");
  await expect(locked).toBeVisible();
  await expect(locked).toContainText("같은 부위 연속 3번");
  await expect(locked.getByRole("link", { name: "라이트 알아보기" })).toBeVisible();
  await page.getByRole("dialog", { name: "운동 순서 정리" }).getByRole("button", { name: "닫기" }).click();

  // 지난번처럼 달리기: 이 루틴 일차의 실내 · 5km · 마무리로 → 바로 런닝 모드(그 설정으로).
  await page.locator("[data-today-focus-badge]").click();
  const like = page.getByTestId("run-like-last");
  await expect(like).toContainText("실내 · 5km · 마무리로");
  await expect(like).toContainText("이 루틴");
  await like.click();
  await expect(page).toHaveURL(/\/running\?mode=indoor&day=0&goal=d5000&replaced=0/);
});

test("라이트: 순서 정리를 오늘만 적용하고(루틴 순서 그대로) 되돌린다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  const { email, user_id } = await setup(page, baseURL!);
  await grantLite(email);
  const positionsBefore = await dbQuery<{ id: string; position: number }>(
    `select id, position from public.routine_exercises where user_id=$1 order by id`,
    [user_id],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.getByTestId("order-organize").click();
  await expect(page.getByTestId("order-streaks")).toContainText("같은 부위 연속 3 →");
  const preview = page.getByTestId("order-preview").locator("li");
  await expect(preview).toHaveCount(5);
  await page.getByTestId("order-apply").click();

  // 새로 고친 화면: 오늘 순서가 저장됐고 루틴 position 은 그대로.
  await expect(page.getByTestId("order-organize")).toContainText("오늘 순서 정리됨", { timeout: 20_000 });
  const [saved] = await dbQuery<{ today_order_date: string; n: number }>(
    `select today_order_date::text, jsonb_array_length(today_order) as n from public.user_routines where user_id=$1`,
    [user_id],
  );
  expect(saved.n).toBe(5);
  const positionsAfter = await dbQuery<{ id: string; position: number }>(
    `select id, position from public.routine_exercises where user_id=$1 order by id`,
    [user_id],
  );
  expect(positionsAfter).toEqual(positionsBefore);
  await expect(page.getByTestId("order-warn")).toHaveCount(0);

  // 되돌리기 → 원래(루틴) 순서.
  await page.getByTestId("order-organize").click();
  await page.getByRole("button", { name: "원래 순서로 되돌리기" }).click();
  await expect(page.getByTestId("order-organize")).toHaveText("순서 정리", { timeout: 20_000 });
  const [cleared] = await dbQuery<{ today_order: unknown }>(`select today_order from public.user_routines where user_id=$1`, [user_id]);
  expect(cleared.today_order).toBeNull();
});
