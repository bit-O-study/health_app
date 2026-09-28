import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 런닝 모드 고도화 1단계 · 데이터 안전(2026-09-28 런닝 모드 고도화 검수보고서 R1·R2·R3).
 *  ① 종료 순간 신호가 없어도 기록이 사라지지 않는다 — 기기에 보관 → 연결되면 자동 저장
 *  ② 달리는 중 GPS 가 잠깐 끊겨도(timeout) 달리기가 끝나지 않는다 — '신호 찾는 중' 후 이어서 기록
 *  ③ 저장은 한 곳 — 그룹 순위 거리 = run_sessions 합계, 마무리 런닝 완료는 한 건
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;

async function fakeGps(page: Page) {
  await page.addInitScript(() => {
    const actualNow = Date.now.bind(Date);
    let offset = 0;
    Date.now = () => actualNow() + offset;
    let watchSuccess: PositionCallback | null = null;
    let watchError: PositionErrorCallback | null | undefined = null;
    const position = (longitude: number): GeolocationPosition => ({
      coords: { latitude: 37.5665, longitude, accuracy: 5, altitude: null, altitudeAccuracy: null, heading: null, speed: null, toJSON: () => ({}) },
      timestamp: Date.now(),
      toJSON: () => ({}),
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => success(position(126.978)),
        watchPosition: (success: PositionCallback, error?: PositionErrorCallback | null) => {
          watchSuccess = success;
          watchError = error;
          success(position(126.978));
          return 1;
        },
        clearWatch: () => {},
      },
    });
    const w = window as unknown as Record<string, unknown>;
    w.__advanceRunTime = (ms: number) => { offset += ms; };
    w.__pushRunPosition = (longitude: number) => watchSuccess?.(position(longitude));
    // code 3 = TIMEOUT, 2 = POSITION_UNAVAILABLE(터널 등)
    w.__failRunPosition = (code: number) =>
      watchError?.({ code, message: "test", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
  });
}

async function run(page: Page, fn: string, arg: number) {
  await page.evaluate(([name, value]) => (window as unknown as Record<string, (v: number) => void>)[name]?.(value), [fn, arg] as const);
}

async function startAndRun(page: Page) {
  await page.goto("/running?mode=outdoor", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByRole("button", { name: "종료" })).toBeVisible();
  await run(page, "__advanceRunTime", 10_000);
  await run(page, "__pushRunPosition", 126.9785); // 약 44m
  await page.waitForTimeout(800);
  await run(page, "__advanceRunTime", 10_000);
  await run(page, "__pushRunPosition", 126.979); // 약 88m 누적
  await page.waitForTimeout(800);
  await run(page, "__advanceRunTime", 55_000);
}

test("GPS 가 잠깐 끊겨도 달리기가 끝나지 않고, 잡히면 이어서 기록한다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await fakeGps(page);
  await signUpAndOnboard(page);
  await startAndRun(page);

  for (const code of [3, 2]) {
    await run(page, "__failRunPosition", code);
    await expect(page.getByTestId("gps-signal-lost")).toBeVisible();
    // 끝나지 않았다 — 종료 버튼이 그대로, 오류 화면 없음
    await expect(page.getByRole("button", { name: "종료" })).toBeVisible();
    await run(page, "__pushRunPosition", 126.9795);
    await expect(page.getByTestId("gps-signal-lost")).toHaveCount(0);
  }
});

test("종료 순간 오프라인이면 기기에 보관하고, 연결되면 저장된다 — 순위 거리·완료도 한 곳에서", async ({ page, context }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(180_000);
  await fakeGps(page);
  const email = await signUpAndOnboard(page);
  await startAndRun(page);

  await context.setOffline(true);
  await page.getByRole("button", { name: "종료" }).click();
  const state = page.getByTestId("run-save-state");
  await expect(state).toHaveAttribute("data-state", "queued", { timeout: 20_000 });
  await expect(state).toContainText("기기에 보관");
  // 기기 대기 큐에 적혀 있다(앱을 닫아도 남는다) — 이어하기 체크포인트는 지워도 안전.
  const queued = await page.evaluate(() => localStorage.getItem("helssu:pending-writes:v1") ?? "");
  expect(queued).toContain('"kind":"run"');
  const before = await dbQuery<{ n: number }>(`select count(*)::int as n from public.run_sessions where user_id=${uid}`, [email]);
  expect(before[0].n).toBe(0);

  // 연결 복구 → 전역 오프라인 배너가 큐를 보낸다.
  await context.setOffline(false);
  await expect
    .poll(async () => (await dbQuery<{ n: number }>(`select count(*)::int as n from public.run_sessions where user_id=${uid}`, [email]))[0].n, { timeout: 30_000 })
    .toBe(1);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("helssu:pending-writes:v1") ?? ""), { timeout: 15_000 }).not.toContain('"kind":"run"');

  // 저장은 한 곳 — 순위 거리는 run_sessions 합계, 마무리 런닝 완료는 한 건(시작일).
  const [row] = await dbQuery<{ for_date: string; distance_m: number }>(
    `select for_date::text, distance_m from public.run_sessions where user_id=${uid}`, [email]);
  const [dist] = await dbQuery<{ meters: number }>(
    `select meters from public.daily_run_distance where user_id=${uid} and for_date=$2::date`, [email, row.for_date]);
  expect(dist.meters).toBe(row.distance_m);
  const comps = await dbQuery<{ n: number }>(
    `select count(*)::int as n from public.conditioning_completions where user_id=${uid} and item_id='running' and for_date=$2::date`, [email, row.for_date]);
  expect(comps[0].n).toBe(1);

  // 같은 런닝을 한 번 더 보내도(큐 재전송 흉내) 두 번 쌓이지 않는다.
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForTimeout(1500);
  const after = await dbQuery<{ n: number }>(`select count(*)::int as n from public.run_sessions where user_id=${uid}`, [email]);
  expect(after[0].n).toBe(1);
});
