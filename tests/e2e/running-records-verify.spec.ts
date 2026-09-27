import { expect, test, type Page } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 런닝 기록 B안 검증 — 고정된 과거 달(2026-06~08)에 알려진 테스트 데이터를 넣고,
 * 화면에 나오는 숫자·문구·링크를 손으로 계산한 기대값과 하나하나 맞춘다.
 *
 * 2026-08 (5회, 24.5km, 8,660초 = 2시간 24분, 평균 353초/km = 5'53")
 *   8/2  (일) 야외 5.00km 1800s 320kcal
 *   8/5  (수) 실내 4.00km 1500s 0kcal  경사 3% · 심박 140/165   → 칼로리 "—"
 *   8/12 (수) 야외 10.0km 3300s 650kcal (경로 없음)              → "경로를 그릴 수 없어요"
 *   8/12 (수) 실내 2.50km  900s 150kcal                          → 같은 날 두 번
 *   8/31 (월) 야외 3.00km 1160s 210kcal 3km 고리 경로            → 1km 6'00" / 7'00" / 6'20"
 * 2026-07 (2회, 14km) → 8월 "지난달보다 10.5km 더"
 * 2026-06 없음      → 7월 "지난달 기록 없음"(화살표 없음), 5월은 빈 달
 * 주별(월요일 시작) 8/1–2 5.00 · 8/3–9 4.00 · 8/10–16 12.5 · – · – · 8/31 3.00
 */

type Run = {
  date: string;
  mode: "indoor" | "outdoor";
  km: number;
  sec: number;
  kcal: number;
  hr?: [number, number];
  incline?: number;
  route?: { lat: number; lng: number; timestamp: number; accuracyM: number }[];
};

// 8/31 07:00 KST 에서 시작하는 반지름 ~478m 원(약 3km), 한 칸 50m.
// 칸당 18초·21초·19초 → 1km 구간 6'00" / 7'00" / 6'20", 전체 1,160초.
const LOOP_T0 = Date.UTC(2026, 7, 30, 22, 0, 0);
const stepSec = (k: number) => (k < 20 ? 18 : k < 40 ? 21 : 19);
const LOOP = Array.from({ length: 61 }, (_, i) => ({
  lat: 37.5665 + 0.004298 * Math.sin((i / 60) * 2 * Math.PI),
  lng: 126.978 + 0.005419 * Math.cos((i / 60) * 2 * Math.PI),
  timestamp: LOOP_T0 + [...Array(i).keys()].reduce((s, k) => s + stepSec(k), 0) * 1000,
  accuracyM: 8,
}));

const RUNS: Run[] = [
  { date: "2026-07-10", mode: "outdoor", km: 8, sec: 2880, kcal: 500 },
  { date: "2026-07-20", mode: "indoor", km: 6, sec: 2400, kcal: 380, incline: 1 },
  { date: "2026-08-02", mode: "outdoor", km: 5, sec: 1800, kcal: 320 },
  { date: "2026-08-05", mode: "indoor", km: 4, sec: 1500, kcal: 0, hr: [140, 165], incline: 3 },
  { date: "2026-08-12", mode: "outdoor", km: 10, sec: 3300, kcal: 650 },
  { date: "2026-08-12", mode: "indoor", km: 2.5, sec: 900, kcal: 150 },
  { date: "2026-08-31", mode: "outdoor", km: 3, sec: 1160, kcal: 210, route: LOOP },
];

/** 그날 07:00 KST 시작으로 한 건 넣는다(속도·페이스는 저장 액션과 같은 식으로 계산). */
async function seedRun(email: string, run: Run): Promise<string> {
  const started = new Date(`${run.date}T07:00:00+09:00`);
  const ended = new Date(started.getTime() + run.sec * 1000);
  const meters = Math.round(run.km * 1000);
  const [row] = await dbQuery<{ id: string }>(
    `insert into public.run_sessions
       (user_id, client_session_id, for_date, mode, started_at, ended_at, duration_sec, distance_m,
        avg_kmh, pace_sec_per_km, calories_kcal, average_heart_rate, max_heart_rate, incline, route_points)
     values ((select id from auth.users where lower(email)=lower($1)), gen_random_uuid(), $2::date, $3,
             $4::timestamptz, $5::timestamptz, $6::int, $7::int, $8::numeric, $9::int, $10::int, $11::int, $12::int, $13::int, $14::jsonb)
     returning id`,
    [
      email, run.date, run.mode, started.toISOString(), ended.toISOString(), run.sec, meters,
      Math.round((meters / 1000 / (run.sec / 3600)) * 10) / 10, Math.round(run.sec / (meters / 1000)),
      run.kcal, run.hr?.[0] ?? null, run.hr?.[1] ?? null, run.incline ?? null, JSON.stringify(run.route ?? []),
    ],
  );
  return row.id;
}

/** 스플래시(약 1.35초)가 걷힌 뒤 찍는다. */
async function settle(page: Page) {
  await expect(page.locator(".app-splash")).toHaveCount(0, { timeout: 5_000 });
}

/** 앱 테마는 OS 가 아니라 localStorage(heltch.theme)를 따른다 — 값을 바꾸고 다시 불러 두 테마를 찍는다. */
async function shoot(page: Page, name: string) {
  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((t) => localStorage.setItem("heltch.theme", t), theme);
    await page.reload({ waitUntil: "networkidle" });
    await settle(page);
    await page.screenshot({ path: test.info().outputPath(`${name}-${theme}.png`), fullPage: true });
  }
}

test("런닝 기록 B안 — 테스트 데이터로 목록·요약·주별·상세·권한 검증", async ({ page, browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(300_000);

  const email = await createOnboardedAccount(page);
  const ids: Record<string, string> = {};
  for (const run of RUNS) ids[`${run.date}-${run.mode}`] = await seedRun(email, run);
  const todayId = (
    await dbQuery<{ id: string }>(
      `insert into public.run_sessions (user_id, client_session_id, for_date, mode, started_at, ended_at, duration_sec, distance_m, avg_kmh, pace_sec_per_km, calories_kcal)
       values ((select id from auth.users where lower(email)=lower($1)), gen_random_uuid(), (now() at time zone 'Asia/Seoul')::date,
               'outdoor', now() - interval '31 minutes', now() - interval '1 minute', 1800, 4200, 8.4, 429, 270)
       returning id`,
      [email],
    )
  )[0].id;

  await test.step("DB: 경로 점 개수 생성 열", async () => {
    const rows = await dbQuery<{ route_point_count: number; n: number }>(
      `select route_point_count, jsonb_array_length(route_points)::int as n from public.run_sessions
        where user_id=(select id from auth.users where lower(email)=lower($1))`,
      [email],
    );
    expect(rows).toHaveLength(8);
    for (const r of rows) expect(r.route_point_count).toBe(r.n);
    expect(rows.map((r) => r.route_point_count).sort((a, b) => b - a)[0]).toBe(61);
  });

  await test.step("2026-08 요약: 24.5km · 5회 · 2시간 24분 · 5'53\" · 지난달보다 10.5km 더", async () => {
    await page.goto("/routine/running-records?m=2026-08", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "2026년 8월" })).toBeVisible();
    const summary = page.getByRole("region", { name: "이달 요약" });
    await expect(summary).toContainText("8월 달린 거리");
    await expect(summary).toContainText("24.5km");
    await expect(summary).toContainText("▲ 지난달보다 10.5km 더");
    await expect(summary).toContainText("횟수5회");
    await expect(summary).toContainText("시간2시간 24분");
    await expect(summary).toContainText("평균 페이스5'53\"");
  });

  await test.step("2026-08 주별 막대: 월요일 시작 6주, 이번 주 없음", async () => {
    const bars = page.getByRole("list", { name: "주별 거리" }).getByRole("listitem");
    await expect(bars).toHaveCount(6);
    const labels = await bars.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(labels).toEqual(["1주 5.00km", "2주 4.00km", "3주 12.5km", "4주 0.00km", "5주 0.00km", "6주 3.00km"]);
  });

  await test.step("2026-08 목록: 주 단위 묶음(최신 주 먼저)·날짜 표기·값 3개", async () => {
    const list = page.getByRole("region", { name: "주별 런닝 기록" });
    await expect(list.getByRole("heading", { level: 3 })).toHaveText([
      "8/31–9/63.00km",
      "8/10–8/1612.5km",
      "8/3–8/94.00km",
      "7/27–8/25.00km",
    ]);
    const rows = list.getByRole("link", { name: /상세 보기$/ });
    await expect(rows).toHaveCount(5);
    await expect(rows.nth(0)).toHaveAccessibleName("8월 31일 (월) 야외 런닝 3.00km 상세 보기");
    await expect(rows.nth(0)).toContainText("19분");
    await expect(rows.nth(0)).toContainText("6'27\"");
    await expect(list.getByRole("link", { name: "8월 12일 (수) 야외 런닝 10.0km 상세 보기" })).toBeVisible();
    await expect(list.getByRole("link", { name: "8월 12일 (수) 실내 런닝 2.50km 상세 보기" })).toBeVisible();
    await expect(list.getByRole("link", { name: "8월 5일 (수) 실내 런닝 4.00km 상세 보기" })).toContainText("6'15\"");
    await expect(list.getByRole("link", { name: "8월 2일 (일) 야외 런닝 5.00km 상세 보기" })).toContainText("30분");
    // 줄에는 kcal·심박·경로 점 수가 없다 + 화면에 ISO 날짜가 없다.
    await expect(list).not.toContainText("kcal");
    await expect(list).not.toContainText("bpm");
    await expect(list).not.toContainText(/경로 \d+점/);
    await expect(page.locator("main")).not.toContainText(/20\d\d-\d\d-\d\d/);
    await expect(page.getByRole("link", { name: "다음 달", exact: true })).toBeVisible();
    await shoot(page, "list-2026-08");
  });

  await test.step("상세(야외·경로): 8/31 3km — 경로 선·19:20·6'27\"·210kcal·1km 구간 3줄", async () => {
    await page.getByRole("link", { name: "8월 31일 (월) 야외 런닝 3.00km 상세 보기" }).click();
    await expect(page).toHaveURL(new RegExp(`/routine/running-records/${ids["2026-08-31-outdoor"]}$`));
    await expect(page.getByRole("heading", { name: "8월 31일 (월) 야외 런닝" })).toBeVisible();
    const summary = page.getByRole("region", { name: "런닝 요약" });
    await expect(summary).toContainText("07:00 – 07:19");
    await expect(summary).toContainText("3.00km");
    await expect(page.getByRole("img", { name: "달린 경로" })).toBeVisible();
    await expect(page.locator("dl").first()).toContainText("시간19:20");
    await expect(page.locator("dl").first()).toContainText("평균 페이스6'27\"");
    await expect(page.locator("dl").first()).toContainText("칼로리210kcal");
    const splits = page.getByRole("region", { name: "1km 구간 페이스" }).getByRole("listitem");
    await expect(splits).toHaveText(["1km6'00\"", "2km7'00\"", "3km6'20\""]);
    // 빠를수록 막대가 길다: 6'00" > 6'20" > 7'00"
    const widths = await splits.evaluateAll((els) => els.map((li) => (li.querySelector("span span") as HTMLElement).getBoundingClientRect().width));
    expect(widths[0]).toBeGreaterThan(widths[2]);
    expect(widths[2]).toBeGreaterThan(widths[1]);
    await shoot(page, "detail-route");
  });

  await test.step("상세(실내): 8/5 — 경로·구간 없음, 칼로리 '—', 경사 3%, 심박 140/165", async () => {
    await page.goto(`/routine/running-records/${ids["2026-08-05-indoor"]}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "8월 5일 (수) 실내 런닝" })).toBeVisible();
    await expect(page.getByRole("img", { name: "달린 경로" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "1km 구간 페이스" })).toHaveCount(0);
    await expect(page.locator("dl").first()).toContainText("시간25:00");
    await expect(page.locator("dl").first()).toContainText("평균 페이스6'15\"");
    await expect(page.locator("dl").first()).toContainText("칼로리—");
    await expect(page.locator("main")).toContainText("경사3%");
    await expect(page.locator("main")).toContainText("평균 140 · 최대 165");
    await expect(page.locator("main")).not.toContainText("0kcal");
    await shoot(page, "detail-indoor");
  });

  await test.step("상세(야외·경로 없음): 8/12 10km — 안내 문구, 구간 없음", async () => {
    await page.goto(`/routine/running-records/${ids["2026-08-12-outdoor"]}`, { waitUntil: "networkidle" });
    await expect(page.getByText("경로가 충분히 저장되지 않아 그릴 수 없어요.")).toBeVisible();
    await expect(page.getByRole("region", { name: "1km 구간 페이스" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "런닝 요약" })).toContainText("10.0km");
    await expect(page.locator("dl").first()).toContainText("시간55:00");
  });

  await test.step("날짜 기록 → 상세: 8/12 두 건 모두 상세로", async () => {
    await page.goto("/settings/history/2026-08-12", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "런닝 세션" })).toBeVisible();
    await page.getByRole("link", { name: "8월 12일 (수) 실내 런닝 2.50km 상세 보기" }).click();
    await expect(page).toHaveURL(new RegExp(`/routine/running-records/${ids["2026-08-12-indoor"]}$`));
  });

  await test.step("2026-07: 14.0km · 지난달 기록 없음(화살표 없음) / 2026-05: 빈 달", async () => {
    await page.goto("/routine/running-records?m=2026-07", { waitUntil: "networkidle" });
    const summary = page.getByRole("region", { name: "이달 요약" });
    await expect(summary).toContainText("14.0km");
    await expect(summary).toContainText("지난달 기록 없음");
    await expect(summary).not.toContainText("▲");
    await expect(summary).not.toContainText("▼");
    await page.goto("/routine/running-records?m=2026-05", { waitUntil: "networkidle" });
    await expect(page.getByRole("region", { name: "이달 요약" })).toContainText("0.00km");
    await expect(page.getByText("이 달에는 저장된 런닝이 없어요.", { exact: false })).toHaveCount(1);
    await expect(page.getByText("지난달", { exact: false })).toHaveCount(0);
  });

  await test.step("이번 달: '이번 주' 표시, 다음 달 없음, 미래·잘못된 ?m= 은 이번 달로", async () => {
    const thisMonth = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date()).slice(0, 7);
    const [y, m] = thisMonth.split("-").map(Number);
    for (const q of ["", "?m=2099-01", "?m=abc"]) {
      await page.goto(`/routine/running-records${q}`, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: `${y}년 ${m}월` })).toBeVisible();
      await expect(page.getByRole("link", { name: "다음 달", exact: true })).toHaveCount(0);
    }
    await expect(page.getByRole("list", { name: "주별 거리" }).getByRole("listitem", { name: /^이번 주 / })).toHaveCount(1);
    await expect(page.getByRole("region", { name: "주별 런닝 기록" }).getByRole("heading", { level: 3 }).first()).toContainText("이번 주");
    await expect(page.getByRole("link", { name: /야외 런닝 4\.20km 상세 보기/ })).toHaveAttribute("href", `/routine/running-records/${todayId}`);
    await shoot(page, "list-this-month");
  });

  await test.step("설정 → 기록: 이번 주 요약 + 런닝 기록 링크(목록 없음)", async () => {
    await page.goto("/settings/history", { waitUntil: "networkidle" });
    await expect(page.getByText("이번 주 런닝")).toBeVisible();
    await expect(page.getByRole("heading", { name: "최근 런닝 기록" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /런닝 .*km 상세 보기$/ })).toHaveCount(0);
    await page.getByRole("link", { name: /런닝 기록 전체 보기/ }).click();
    await expect(page).toHaveURL(/\/routine\/running-records$/);
  });

  await test.step("권한: 다른 계정의 기록은 404, 목록에도 안 보임", async () => {
    const other = await browser.newContext();
    try {
      const otherPage = await other.newPage();
      const otherEmail = await createOnboardedAccount(otherPage);
      const otherId = await seedRun(otherEmail, { date: "2026-08-20", mode: "outdoor", km: 7.77, sec: 2700, kcal: 400 });
      await page.goto(`/routine/running-records/${otherId}`);
      await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();
      await expect(page.getByText("7.77")).toHaveCount(0);
      await page.goto("/routine/running-records?m=2026-08", { waitUntil: "networkidle" });
      await expect(page.getByRole("region", { name: "이달 요약" })).toContainText("24.5km");
      await expect(page.getByText("7.77")).toHaveCount(0);
      // 반대로 그 계정은 자기 기록을 본다.
      await otherPage.goto(`/routine/running-records/${otherId}`, { waitUntil: "networkidle" });
      await expect(otherPage.getByRole("region", { name: "런닝 요약" })).toContainText("7.77km");
    } finally {
      await other.close();
    }
  });
});
