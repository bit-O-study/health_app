import { expect, test, type Page } from "@playwright/test";

import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 라이트 매일 쓰는 혜택(2026-10-08 라이트 혜자 보고서).
 * - 운동 탭 '오늘 운동 리포트': 하나라도 끝내면 지난번 대비·신기록·이번 주. 무료는 총량 한 줄 + 잠금.
 * - 홈 '오늘 한 줄': 오래 쉰 부위 → 그 부위 추천. 생리 중이면 주기 팁이 먼저. 무료는 없음.
 * - 기록 탭: 몸 변화 × 운동량(체중·러닝 포함) · 종목별 기록 찾기.
 */
const daysAgo = (today: string, n: number) => new Date(Date.parse(`${today}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

async function setup(page: Page, baseURL: string) {
  await silenceDevOverlay(page);
  const { email, supabase, user_id } = await createTestAccount(page.context(), baseURL, false);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const r = await supabase.from("user_routines").insert({
    user_id, splits: 0, variant_id: "custom",
    custom_week: [["chest"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"]],
    start_date: today, day_index_migrated: true,
  });
  if (r.error) throw r.error;
  // 10일 전 하체, 6일 전 가슴(벤치 60×8), 오늘 가슴(벤치 60×10 — 같은 무게 +2회, 신기록).
  const rows: [number, string, number, number, number][] = [
    [10, "squat", 80, 8, 4],
    [6, "bench-press", 60, 8, 4],
    [0, "bench-press", 60, 10, 4],
  ];
  for (const [ago, exercise_id, kg, reps, sets] of rows) {
    await dbQuery(
      `insert into public.exercise_completions (user_id, for_date, exercise_row_id, status, exercise_id, equipment, sets, reps, weight_kg)
       values ($1, $2, gen_random_uuid(), 'done', $3, 'barbell', $4, $5, $6)`,
      [user_id, daysAgo(today, ago), exercise_id, sets, reps, kg],
    );
  }
  return { email, user_id, today };
}

async function grantLite(email: string) {
  await dbQuery(
    `insert into public.subscriptions (user_id, platform, product_id, purchase_token, state, expires_at, auto_renewing)
     values ((select id from auth.users where lower(email)=lower($1)), 'google_play', 'helssu_lite_monthly', gen_random_uuid()::text, 'active', now() + interval '20 days', true)`,
    [email],
  );
}

test("라이트: 운동 끝 리포트(지난번 대비·신기록)와 홈 오늘 한 줄", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  const { email } = await setup(page, baseURL!);
  await grantLite(email);

  await page.goto("/routine", { waitUntil: "networkidle" });
  const report = page.getByTestId("session-report");
  await expect(report).toBeVisible({ timeout: 20_000 });
  await expect(report).toContainText("1개 · 4세트");
  await expect(report).toContainText("이번 주");
  await expect(report.getByTestId("session-report-vs")).toContainText("지난 가슴 날");
  await expect(report.getByTestId("session-report-prs")).toContainText("벤치프레스 신기록");
  await expect(report.getByTestId("session-report-compares")).toContainText("60kg×8 → 60kg×10");
  await expect(report.getByTestId("session-report-compares")).toContainText("+2회");
  await expect(report.getByTestId("session-report-locked")).toHaveCount(0);

  // 오늘 운동을 했으니 홈 한 줄은 잔소리 대신 정리 + 가슴 다시 할 때(2026-10-08 디테일).
  await page.goto("/home", { waitUntil: "networkidle" });
  const brief = page.getByTestId("home-briefing");
  await expect(brief).toHaveAttribute("data-kind", "today", { timeout: 15_000 });
  await expect(brief).toContainText("오늘 가슴 4세트 했어요");
  await expect(brief).toContainText("다음 가슴 운동은");
  await brief.click();
  await page.waitForURL("**/routine", { timeout: 15_000 });
  // 운동 끝 리포트 — 종목별 지난번 대비 볼륨·예상 최대, 가슴 다시 하기 좋은 때.
  await expect(page.getByTestId("session-report-detail-bench-press")).toContainText("볼륨 2.4t(+480kg)", { timeout: 20_000 });
  await expect(page.getByTestId("session-report-ready")).toContainText("가슴");
});

test("무료: 운동 리포트는 총량 한 줄 + 잠금, 홈 오늘 한 줄은 없음", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(120_000);
  await setup(page, baseURL!);

  await page.goto("/routine", { waitUntil: "networkidle" });
  const report = page.getByTestId("session-report");
  await expect(report).toContainText("1개 · 4세트", { timeout: 20_000 });
  await expect(report.getByTestId("session-report-locked")).toContainText("라이트");
  await expect(report.getByTestId("session-report-compares")).toHaveCount(0);

  await page.goto("/home", { waitUntil: "networkidle" });
  await expect(page.getByRole("navigation", { name: "앱", exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("home-briefing")).toHaveCount(0);
});

test("라이트: 몸 변화 × 운동량(체중·러닝)과 종목별 기록 찾기", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  const { email, user_id, today } = await setup(page, baseURL!);
  await grantLite(email);
  await dbQuery(
    `insert into public.weight_logs (user_id, weight_kg, created_at) values ($1, 80, $2::date - 20), ($1, 78.5, $2::date)`,
    [user_id, today],
  );
  await dbQuery(
    `insert into public.run_sessions (user_id, client_session_id, for_date, mode, started_at, ended_at, duration_sec, distance_m)
     values ($1, gen_random_uuid(), $2, 'indoor', now() - interval '31 minutes', now() - interval '1 minute', 1800, 5000)`,
    [user_id, today],
  );

  await page.goto("/fit/report", { waitUntil: "networkidle" });
  // 지난달은 같은 날짜까지만 비교, 러닝한 날도 운동한 날(2026-10-08).
  await expect(page.getByTestId("fit-report-compare-range")).toContainText("지난달 같은 기간");
  await expect(page.getByTestId("fit-report-compare-range")).toContainText("러닝한 날 포함");
  const card = page.getByTestId("lite-report-body-training");
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card.getByTestId("lite-report-body-training-headline")).toContainText("체중 −1.5kg");
  await expect(card).toContainText("5km");
  await expect(card).toContainText("78.5kg");

  await page.getByTestId("fit-records-link").click();
  await page.waitForURL("**/fit/records", { timeout: 15_000 });
  await expect(page.getByTestId("fit-records-index")).toContainText("벤치프레스");
  await page.getByLabel("종목 이름으로 찾기").fill("벤치");
  await page.getByRole("button", { name: "찾기" }).click();
  await page.waitForURL(/q=/, { timeout: 15_000 });
  await expect(page.getByTestId("fit-records-index")).not.toContainText("스쿼트");
  await page.getByTestId("fit-records-ex-bench-press").click();
  const sessions = page.getByTestId("fit-records-sessions");
  await expect(sessions).toContainText("벤치프레스", { timeout: 15_000 });
  await expect(page.getByTestId("fit-records-best")).toContainText("60kg × 10회");
  await expect(sessions).toContainText("신기록");
  await expect(sessions).toContainText("4세트 × 8회 · 60kg");
});

test("라이트: 생리 중이면 홈 오늘 한 줄이 주기 팁", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(120_000);
  const { email, user_id, today } = await setup(page, baseURL!);
  await grantLite(email);
  await dbQuery(
    `insert into public.cycle_logs (user_id, for_date, is_period) values ($1, $2::date - 1, true), ($1, $2::date, true)`,
    [user_id, today],
  );
  await page.goto("/home", { waitUntil: "networkidle" });
  const brief = page.getByTestId("home-briefing");
  await expect(brief).toHaveAttribute("data-kind", "cycle", { timeout: 15_000 });
  await expect(brief).toContainText("생리 2일차예요");
  await expect(brief).toContainText("90%");
});

test("무료: 종목별 기록 찾기는 잠금", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(120_000);
  const { email } = await setup(page, baseURL!);
  // 무료는 맞춤 운동 스위치가 켜진 계정에서만 보인다 — 이 계정만 잠깐 디버그 계정으로.
  await dbQuery(
    `insert into public.app_settings(key, value) values ('debug.accounts', jsonb_build_array($1::text))
     on conflict (key) do update set value = coalesce(public.app_settings.value, '[]'::jsonb) || jsonb_build_array($1::text)`,
    [email],
  );
  try {
    await page.goto("/fit/records", { waitUntil: "networkidle" });
    await expect(page.getByTestId("fit-locked")).toContainText("종목별 기록", { timeout: 15_000 });
    await expect(page.getByTestId("fit-records-index")).toHaveCount(0);
  } finally {
    await dbQuery(
      `update public.app_settings set value = coalesce((select jsonb_agg(e) from jsonb_array_elements_text(value) e where e <> $1), '[]'::jsonb) where key='debug.accounts'`,
      [email],
    );
  }
});

test("라이트: 내 앱의 맞춤 운동을 끌어 하단바에 넣으면 하단바에 맞춤 운동이 보인다(2026-10-08)", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(120_000);
  const { email } = await setup(page, baseURL!);
  await grantLite(email);
  await page.goto("/home", { waitUntil: "networkidle" });
  const grid = page.getByRole("navigation", { name: "앱", exact: true });
  await grid.getByRole("button", { name: "편집", exact: true }).click();
  const editor = grid.getByRole("region", { name: "하단 바로가기 편집", exact: true });
  const slot1 = editor.getByRole("button", { name: /^하단 1번 자리:/ });
  // 누르고 → 자리 누르기(끌기와 같은 경로) — 맞춤 운동을 1번 자리에.
  await grid.getByRole("button", { name: "맞춤 운동 하단에 놓기", exact: true }).click();
  await slot1.click();
  await expect(slot1).toHaveAccessibleName("하단 1번 자리: 맞춤 운동");
  await grid.getByRole("button", { name: "완료", exact: true }).click();
  await page.reload({ waitUntil: "networkidle" });
  const bottom = page.getByRole("navigation", { name: "주요 메뉴" });
  // 🔴 예전엔 하단바가 맞춤 운동을 모르는 목록을 써서 '앱 추가'로만 보였다.
  await expect(bottom.getByRole("link", { name: "맞춤 운동", exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(bottom.getByRole("link", { name: "앱 추가", exact: true })).toHaveCount(0);
  await bottom.getByRole("link", { name: "맞춤 운동", exact: true }).click();
  await page.waitForURL("**/fit", { timeout: 15_000 });
});
