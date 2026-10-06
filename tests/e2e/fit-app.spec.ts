import { expect, test, type Page } from "@playwright/test";

import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 맞춤 운동 앱(라이트 990원, 2026-10-01).
 * - 라이트 이상: 전부 열림(추천 3·부위 25·균형), 스위치와 상관없이 보인다.
 * - 무료: 공개 스위치(`fit`)가 꺼져 있으면 안 보이고, 켜지면 맛보기(추천 1개)와 잠금.
 * 🔴 적용은 오늘만 운동 변경으로만(사용자 결정) — 영구 루틴은 그대로.
 */
async function setup(page: Page, baseURL: string) {
  await silenceDevOverlay(page);
  const { email, supabase, user_id } = await createTestAccount(page.context(), baseURL, false);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const r = await supabase.from("user_routines").insert({
    user_id, splits: 0, variant_id: "custom",
    custom_week: [["lower"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"]],
    start_date: today, day_index_migrated: true,
  });
  if (r.error) throw r.error;
  const ex = await supabase.from("routine_exercises").insert({
    user_id, day_index: 0, focus: "lower", position: 0, exercise_id: "squat",
    equipment: "barbell", sets: 4, reps: 8, weight_kg: 60,
  });
  if (ex.error) throw ex.error;
  // 어제 가슴만 잔뜩 — 밀기 쪽으로 치우친 한 주.
  const c = await supabase.from("exercise_completions").insert({
    user_id, for_date: yesterday, exercise_row_id: crypto.randomUUID(), status: "done",
    exercise_id: "bench-press", equipment: "barbell", focus: "chest", sets: 10, reps: 8, weight_kg: 60,
  });
  if (c.error) throw c.error;
  // 8일 전 벤치 55kg — 지난 7일 자극에는 안 들어가고, 어제 60kg 이 신기록이 된다.
  const older = new Date(Date.parse(`${today}T00:00:00Z`) - 8 * 86_400_000).toISOString().slice(0, 10);
  const o = await supabase.from("exercise_completions").insert({
    user_id, for_date: older, exercise_row_id: crypto.randomUUID(), status: "done",
    exercise_id: "bench-press", equipment: "barbell", focus: "chest", sets: 4, reps: 8, weight_kg: 55,
  });
  if (o.error) throw o.error;
  return { email, user_id, today };
}

/**
 * 하단 탭 이동(2026-10-06 UI 개편 — 오늘 추천 · 내 몸 균형 · 성장 · 리포트). 누르고 그 주소가 될 때까지
 * 기다린다(앞 화면을 그리는 중에 누르면 이동이 씹힌다).
 */
async function openTab(page: Page, name: string, path: string) {
  await expect(page.getByTestId("fit-page")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name, exact: true }).last().click();
  await page.waitForURL((u) => new URL(u).pathname === path, { timeout: 15_000 });
  await expect(page.getByTestId("fit-page")).toBeVisible({ timeout: 15_000 });
}

async function grantLite(email: string) {
  await dbQuery(
    `insert into public.subscriptions (user_id, platform, product_id, purchase_token, state, expires_at, auto_renewing)
     values ((select id from auth.users where lower(email)=lower($1)), 'google_play', 'helssu_lite_monthly', gen_random_uuid()::text, 'active', now() + interval '20 days', true)`,
    [email],
  );
}

test("라이트: 추천·부위·균형이 다 열리고, [더하기]는 오늘만 담는다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  const { email, user_id, today } = await setup(page, baseURL!);
  await grantLite(email);

  await page.goto("/fit", { waitUntil: "networkidle" });
  const root = page.getByTestId("fit-page");
  await expect(root).toHaveAttribute("data-full", "1", { timeout: 15_000 });
  await expect(page.getByTestId("fit-headline")).toContainText("부족해요");
  await expect(page.getByTestId("fit-lacking")).toContainText("세트");
  // 추천마다 처방(세트 × 회)과 채우는 양(세트 단위)이 보인다.
  await expect(page.getByTestId("fit-pick-rx").first()).toContainText("세트 ×");
  await expect(page.getByTestId("fit-locked")).toHaveCount(0);
  const picks = page.getByTestId("fit-picks").locator("li");
  await expect(picks).toHaveCount(3);
  // 가슴은 이미 넘쳤으니 벤치프레스는 추천하지 않는다.
  await expect(page.getByTestId("fit-pick-bench-press")).toHaveCount(0);

  await openTab(page, "내 몸 균형", "/fit/balance");
  await expect(page.getByTestId("fit-legend")).toContainText("넘침");
  // 부위를 누르면 세부 근육과 비율이 펼쳐진다(가슴은 넘쳐서 숫자 대신 '넘침').
  await expect(page.getByTestId("fit-part-chest")).toContainText("넘침");
  await page.getByTestId("fit-part-back").locator("summary").click();
  await expect(page.getByTestId("fit-balance-push-pull")).toBeVisible();
  await expect(page.getByTestId("fit-balance-push-pull")).toContainText("당기기 부족");
  // '등 채우는 운동 보기' → 그 부위 추천만.
  await page.getByTestId("fit-part-go-back").click();
  await page.waitForURL("**/fit?part=back", { timeout: 15_000 });
  await expect(page.getByTestId("fit-headline")).toContainText("등 채우는 운동");
  await page.goto("/fit/balance", { waitUntil: "networkidle" });

  await openTab(page, "성장", "/fit/growth");
  await expect(page.getByTestId("fit-growth-bench-press")).toContainText("벤치프레스", { timeout: 15_000 });
  await expect(page.getByTestId("fit-prs")).toContainText("벤치프레스");
  await openTab(page, "리포트", "/fit/report");
  await expect(page.getByTestId("fit-report")).toContainText("운동한 날", { timeout: 15_000 });
  // 빈 리포트는 카드 여러 장 대신 한 장으로.
  await expect(page.getByTestId("lite-report-empty")).toContainText("기록하면 더 보여요");
  await expect(page.getByTestId("lite-report-body")).toHaveCount(0);

  // 예전 주소(?tab=)는 새 화면으로 넘어간다.
  await page.goto("/fit?tab=parts", { waitUntil: "networkidle" });
  await page.waitForURL("**/fit/balance", { timeout: 15_000 });

  await openTab(page, "오늘 추천", "/fit");
  await expect(page.getByTestId("fit-add")).toHaveText("오늘 운동에 3개 더하기", { timeout: 10_000 });
  await page.getByTestId("fit-add").click();
  // 오늘 루틴 고정 + 담기라 개발 서버에선 20초를 넘기기도 한다.
  await page.waitForURL("**/routine", { timeout: 45_000 });

  const daily = await dbQuery<{ n: string }>(
    `select count(*) n from public.daily_plan where user_id=$1 and for_date=$2 and exercise_id <> 'squat'`,
    [user_id, today],
  );
  expect(Number(daily[0].n)).toBe(3);

  // 담은 뒤 다시 와도 또 담으라고 하지 않는다 — 오늘 운동 하러 가기 + '더 추천 받기'.
  await page.goto("/fit", { waitUntil: "networkidle" });
  await expect(page.getByTestId("fit-today-done")).toContainText("오늘 추천을 담았어요", { timeout: 15_000 });
  await expect(page.getByTestId("fit-planned")).toContainText("포함");
  await expect(page.getByTestId("fit-picks")).toHaveCount(0);
  await page.getByTestId("fit-more").click();
  await page.waitForURL("**/fit?more=1", { timeout: 15_000 });
  await expect(page.getByTestId("fit-picks")).toBeVisible({ timeout: 15_000 });
  // 🔴 원칙 2 — 영구 루틴은 그대로.
  const kept = await dbQuery<{ exercise_id: string }>(`select exercise_id from public.routine_exercises where user_id=$1`, [user_id]);
  expect(kept.map((k) => k.exercise_id)).toEqual(["squat"]);
});

test("무료(스위치 꺼짐): 맞춤 운동이 보이지 않는다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await setup(page, baseURL!);
  await page.goto("/fit", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible({ timeout: 15_000 });
});

test("무료(공개 스위치 켜진 계정): 맛보기 추천 1개 + 잠금", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(120_000);
  const { email } = await setup(page, baseURL!);
  // 스위치 기본값은 '디버그 계정만' — 이 계정만 잠깐 디버그 계정으로.
  await dbQuery(
    `insert into public.app_settings(key, value) values ('debug.accounts', jsonb_build_array($1::text))
     on conflict (key) do update set value = coalesce(public.app_settings.value, '[]'::jsonb) || jsonb_build_array($1::text)`,
    [email],
  );
  try {
    await page.goto("/fit", { waitUntil: "networkidle" });
    await expect(page.getByTestId("fit-page")).toHaveAttribute("data-full", "0", { timeout: 15_000 });
    await expect(page.getByTestId("fit-picks").locator("li")).toHaveCount(1);
    await expect(page.getByTestId("fit-locked")).toBeVisible();
    // 무료는 '바꾸기' 없이 '더하기'만.
    await expect(page.getByTestId("fit-replace")).toHaveCount(0);
    await openTab(page, "내 몸 균형", "/fit/balance");
    await expect(page.getByTestId("fit-headline")).toBeVisible();
    await expect(page.getByTestId("fit-parts-free")).toBeVisible();
    await expect(page.getByTestId("fit-locked")).toContainText("세부 근육 25개");
    // 무료 맛보기: 신기록은 보이고 종목별 추이는 잠금.
    await openTab(page, "성장", "/fit/growth");
    await expect(page.getByTestId("fit-prs")).toContainText("벤치프레스", { timeout: 15_000 });
    await expect(page.getByTestId("fit-growth-bench-press")).toHaveCount(0);
    await openTab(page, "리포트", "/fit/report");
    await expect(page.getByTestId("fit-locked")).toContainText("라이트에서 볼 수 있어요");
  } finally {
    await dbQuery(
      `update public.app_settings set value = coalesce((select jsonb_agg(e) from jsonb_array_elements_text(value) e where e <> $1), '[]'::jsonb) where key='debug.accounts'`,
      [email],
    );
  }
});

test("라이트: [바꾸기]는 확인 후에만 — 취소하면 그대로, 바꾸면 고른 것만 오늘 운동이 되고 원래 운동은 내일로", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  const { email, user_id, today } = await setup(page, baseURL!);
  await grantLite(email);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/fit", { waitUntil: "networkidle" });
  await expect(page.getByTestId("fit-picks").locator("li")).toHaveCount(3, { timeout: 15_000 });
  // 하나 끄면 '2개'로 — 고른 것만 담는다.
  await page.getByTestId("fit-picks").getByRole("checkbox").first().uncheck();
  await expect(page.getByTestId("fit-add")).toHaveText("오늘 운동에 2개 더하기");

  await page.getByTestId("fit-replace").click();
  await expect(page.getByTestId("fit-replace-confirm")).toContainText("내일로 미뤄져요");
  await page.getByTestId("fit-replace-no").click();
  await expect(page.getByTestId("fit-replace-confirm")).toHaveCount(0);
  const before = await dbQuery<{ n: string }>(`select count(*) n from public.daily_plan where user_id=$1 and for_date=$2`, [user_id, today]);
  expect(Number(before[0].n)).toBe(0);

  await page.getByTestId("fit-replace").click();
  await page.getByTestId("fit-replace-yes").click();
  await page.waitForURL("**/routine", { timeout: 45_000 });
  await expect(page.getByText("페이지를 찾을 수 없어요")).toHaveCount(0);
  await expect(page.getByText("잠깐 문제가 생겼어요")).toHaveCount(0);
  const plan = await dbQuery<{ exercise_id: string }>(`select exercise_id from public.daily_plan where user_id=$1 and for_date=$2`, [user_id, today]);
  expect(plan.map((p) => p.exercise_id)).not.toContain("squat");
  expect(plan).toHaveLength(2);
  // 🔴 원칙 2 — 영구 루틴은 그대로.
  const kept = await dbQuery<{ exercise_id: string }>(`select exercise_id from public.routine_exercises where user_id=$1`, [user_id]);
  expect(kept.map((k) => k.exercise_id)).toEqual(["squat"]);
  expect(errors).toEqual([]);
});
