import { writeFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 캘린더 3단계(2026-09-29) — 연속 운동 일수 · 운동량 농도 · 예정 루틴(읽기 전용) ·
 * 운동 기록 화면과 연결 · 이달 기록 이미지.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("🔴 연속 운동 일수·농도·예정 루틴이 보이고, 루틴은 바뀌지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  // 루틴: 매일 하체(휴식 없음) — 앞으로의 날짜에 '하체' 가 예정으로 보여야 한다.
  await dbQuery(
    `update public.user_routines set splits=0, variant_id='custom',
        custom_week='[["lower"],["lower"],["lower"],["lower"],["lower"],["lower"],["lower"]]'::jsonb,
        start_date=${today}, day_index_migrated=true, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  const before = await dbQuery<{ custom_week: unknown }>(`select custom_week from public.user_routines where user_id=${uid}`, [email]);
  // 어제·그제 근력운동(오늘은 아직 안 함) → 2일 연속. 어제 세트가 많아 더 진하게.
  await dbQuery(
    `insert into public.exercise_completions (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus, sets, reps, weight_kg)
     values (${uid}, ${today} - 1, gen_random_uuid(), 'done', 'squat', 'barbell', 'lower', 8, 8, 60),
            (${uid}, ${today} - 2, gen_random_uuid(), 'done', 'squat', 'barbell', 'lower', 2, 8, 60)`,
    [email],
  );

  await page.goto("/calendar", { waitUntil: "networkidle" });
  await expect(page.getByTestId("calendar-streak")).toHaveText(/2일 연속 운동/);

  // 이번 달 안에 그 이틀이 있으면(월초가 아니면) 어제가 가장 진하다.
  const dayNum = Number(
    (await dbQuery<{ d: number }>(`select extract(day from ${today})::int as d`, []))[0].d,
  );
  if (dayNum >= 3) {
    const cells = page.locator("a[data-level]");
    const levels = await cells.evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-level"))));
    expect(Math.max(...levels)).toBe(3);
  }

  // 월말이 아니면 내일 칸에 '하체' 예정 표시.
  const last = Number(
    (await dbQuery<{ d: number }>(`select extract(day from (date_trunc('month', ${today}) + interval '1 month - 1 day'))::int as d`, []))[0].d,
  );
  if (dayNum < last) {
    await expect(page.getByTestId("planned").first()).toHaveText("하체");
  }
  await expect(page.getByTestId("calendar-legend")).toContainText("예정 루틴");

  // 주간 목록에도 예정(오늘이 일요일이 아니면).
  await page.goto("/calendar/week", { waitUntil: "networkidle" });
  const dow = Number((await dbQuery<{ d: number }>(`select extract(isodow from ${today})::int as d`, []))[0].d);
  if (dow < 7) await expect(page.getByTestId("planned").first()).toContainText("예정 · 하체");

  // 원칙 2 — 캘린더를 봐도 루틴은 그대로.
  const after = await dbQuery<{ custom_week: unknown }>(`select custom_week from public.user_routines where user_id=${uid}`, [email]);
  expect(after[0].custom_week).toEqual(before[0].custom_week);
});

test("운동 기록 화면과 서로 오가고, 이달 기록 이미지가 PNG 로 나온다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await createOnboardedAccount(page);

  await page.goto("/calendar", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "운동 기록" }).click();
  await expect(page).toHaveURL(/\/settings\/history\?month=\d{4}-\d{2}/);
  await page.getByRole("link", { name: /캘린더에서 보기/ }).click();
  await expect(page).toHaveURL(/\/calendar\?m=\d{4}-\d{2}/);

  const share = page.getByTestId("share-month-image");
  await expect(share).toHaveAttribute("href", /\/api\/calendar\/month-image\?m=\d{4}-\d{2}/);
  const href = (await share.getAttribute("href"))!;
  const res = await page.request.get(href);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
  expect(res.headers()["cache-control"]).toContain("no-store");
  const body = await res.body();
  expect(body.byteLength).toBeGreaterThan(10_000);
  // 눈으로 확인할 때만: E2E_SAVE_IMG=경로 로 이미지를 저장한다.
  if (process.env.E2E_SAVE_IMG) writeFileSync(process.env.E2E_SAVE_IMG, body);
});

test("이달 기록 이미지는 로그인해야 받을 수 있다", async ({ request }) => {
  const res = await request.get("/api/calendar/month-image?m=2026-09", { maxRedirects: 0 });
  expect([401, 302, 307]).toContain(res.status());
});

test("🔴 매일 운동하는 사람(기록 1,000행 넘음)도 연속 일수가 정확하다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(120_000);
  const email = await createOnboardedAccount(page);
  // 오늘 포함 150일 연속, 하루 8종목 → 1,200행. 예전처럼 1년을 한 번에 읽으면 1,000행에서 잘린다.
  await dbQuery(
    `insert into public.exercise_completions (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus, sets, reps, weight_kg)
     select ${uid}, ${today} - g, gen_random_uuid(), 'done', e, 'barbell', 'lower', 3, 8, 40
       from generate_series(0, 149) g,
            unnest(array['squat','deadlift','bench-press','ohp','barbell-row','lunge','leg-press','rdl']) e`,
    [email],
  );
  await page.goto("/calendar", { waitUntil: "networkidle" });
  await expect(page.getByTestId("calendar-streak")).toHaveText(/150일 연속 운동/);
});
