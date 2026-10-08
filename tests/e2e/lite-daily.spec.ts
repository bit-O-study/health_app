import { expect, test, type Page } from "@playwright/test";

import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 라이트 매일 쓰는 혜택(2026-10-08 라이트 혜자 보고서).
 * - 운동 탭 '오늘 운동 리포트': 하나라도 끝내면 지난번 대비·신기록·이번 주. 무료는 총량 한 줄 + 잠금.
 * - 홈 '오늘 한 줄': 오래 쉰 부위 → 그 부위 추천. 무료는 없음.
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
  return { email };
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

  await page.goto("/home", { waitUntil: "networkidle" });
  const brief = page.getByTestId("home-briefing");
  await expect(brief).toContainText("하체 운동을 10일째 쉬고 있어요", { timeout: 15_000 });
  await brief.click();
  await page.waitForURL("**/fit?part=lower", { timeout: 15_000 });
  await expect(page.getByTestId("fit-headline")).toContainText("하체 채우는 운동");
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
