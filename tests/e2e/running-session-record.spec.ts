import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

test("위치 권한이 거부되면 야외 러닝 시작을 차단한다", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
        },
        watchPosition: () => 1,
        clearWatch: () => {},
      },
    });
  });

  await page.goto("/running?mode=outdoor");
  await expect(page.getByText(/위치 권한이 필요해요/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "시작하기" })).toHaveCount(0);
});

test("중단된 야외 러닝 체크포인트를 안내하고 폐기한다", async ({ page }) => {
  await page.addInitScript(() => {
    const now = Date.now();
    localStorage.setItem("heltch.running.checkpoint", JSON.stringify({
      version: 1,
      sessionId: "123e4567-e89b-42d3-a456-426614174000",
      mode: "outdoor",
      forDate: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(now)),
      elapsedSec: 125,
      distanceM: 640,
      speedKmh: 7.5,
      incline: null,
      route: [],
      updatedAt: now,
    }));
    const position = {
      coords: {
        latitude: 37.5665,
        longitude: 126.978,
        accuracy: 5,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: now,
      toJSON: () => ({}),
    } as GeolocationPosition;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => success(position),
        watchPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 2, message: "GPS signal lost", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
          return 1;
        },
        clearWatch: () => {},
      },
    });
  });

  await page.goto("/running?mode=outdoor");
  await expect(page.getByText("중단된 야외 런닝이 있어요")).toBeVisible();
  await expect(page.getByText("02:05 · 0.64km")).toBeVisible();
  await page.getByRole("button", { name: "이어하기" }).click();
  // 2026-09-28 런닝 1단계: 달리는 중 위치 오류(신호 없음)는 달리기를 끝내지 않는다 —
  // '신호 찾는 중' 안내만 뜨고 이어 달린다. 체크포인트도 그대로 남는다.
  await expect(page.getByTestId("gps-signal-lost")).toBeVisible();
  await expect(page.getByRole("button", { name: "종료" })).toBeVisible();
  await expect(page.evaluate(() => localStorage.getItem("heltch.running.checkpoint"))).resolves.not.toBeNull();

  await page.reload();
  await expect(page.getByText("중단된 야외 런닝이 있어요")).toBeVisible();
  await page.getByRole("button", { name: "삭제" }).click();
  await expect(page.getByText("중단된 야외 런닝이 있어요")).toBeHidden();
  await expect(page.evaluate(() => localStorage.getItem("heltch.running.checkpoint"))).resolves.toBeNull();
});

test("야외 러닝 종료 시 개별 세션의 시간·거리·칼로리·경로를 저장한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await page.addInitScript(() => {
    const actualNow = Date.now.bind(Date);
    let offset = 0;
    Date.now = () => actualNow() + offset;
    let watchSuccess: PositionCallback | null = null;
    const position = (longitude: number): GeolocationPosition => ({
      coords: {
        latitude: 37.5665,
        longitude,
        accuracy: 5,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: Date.now(),
      toJSON: () => ({}),
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => success(position(126.978)),
        watchPosition: (success: PositionCallback) => {
          watchSuccess = success;
          success(position(126.978));
          return 1;
        },
        clearWatch: () => {},
      },
    });
    const controls = window as Window & {
      __advanceRunTime?: (ms: number) => void;
      __pushRunPosition?: (longitude: number) => void;
    };
    controls.__advanceRunTime = (ms) => {
      offset += ms;
    };
    controls.__pushRunPosition = (longitude) => watchSuccess?.(position(longitude));
  });
  const email = await signUpAndOnboard(page);

  await page.goto("/running?mode=outdoor", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "야외 런닝 📍" })).toBeVisible();
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByRole("button", { name: "종료" })).toBeVisible();

  await page.evaluate(() =>
    (window as Window & { __advanceRunTime?: (ms: number) => void }).__advanceRunTime?.(
      10_000,
    ),
  );
  await page.evaluate(() =>
    (
      window as Window & { __pushRunPosition?: (longitude: number) => void }
    ).__pushRunPosition?.(126.9787),
  );
  await page.waitForTimeout(1_000);
  await page.evaluate(() =>
    (window as Window & { __advanceRunTime?: (ms: number) => void }).__advanceRunTime?.(
      55_000,
    ),
  );
  await page.getByRole("button", { name: "종료" }).click();

  const uid = `(select id from auth.users where lower(email)=lower($1))`;
  await expect
    .poll(async () => {
      const rows = await dbQuery<{
        mode: string;
        duration_sec: number;
        distance_m: number;
        calories_kcal: number;
        route_count: number;
      }>(
        `select mode, duration_sec, distance_m, calories_kcal,
                jsonb_array_length(route_points)::int as route_count
           from public.run_sessions where user_id=${uid}`,
        [email],
      );
      return rows[0] ?? null;
    })
    .toMatchObject({
      mode: "outdoor",
      duration_sec: expect.any(Number),
      distance_m: expect.any(Number),
      calories_kcal: expect.any(Number),
      route_count: expect.any(Number),
    });

  const [saved] = await dbQuery<{
    duration_sec: number;
    distance_m: number;
    calories_kcal: number;
    route_count: number;
  }>(
    `select duration_sec, distance_m, calories_kcal,
            jsonb_array_length(route_points)::int as route_count
       from public.run_sessions where user_id=${uid}`,
    [email],
  );
  expect(saved.duration_sec).toBeGreaterThanOrEqual(60);
  expect(saved.distance_m).toBeGreaterThanOrEqual(50);
  expect(saved.calories_kcal).toBeGreaterThan(0);
  expect(saved.route_count).toBeGreaterThanOrEqual(2);

  // 목록용 경로 점 개수는 DB 생성 열(route_point_count) — 저장된 경로 길이와 같아야 한다.
  const [counted] = await dbQuery<{ id: string; route_point_count: number; route_count: number }>(
    `select id, route_point_count, jsonb_array_length(route_points)::int as route_count
       from public.run_sessions where user_id=${uid}`,
    [email],
  );
  expect(counted.route_point_count).toBe(counted.route_count);

  // 설정 → 기록: 이번 주 요약만 두고 목록은 런닝 기록 탭으로 연결(B안).
  await page.goto("/settings/history", { waitUntil: "networkidle" });
  await expect(page.getByText("이번 주 런닝")).toBeVisible();
  await expect(page.getByRole("heading", { name: "최근 런닝 기록" })).toHaveCount(0);
  await page.getByRole("link", { name: /런닝 기록 전체 보기/ }).click();
  await expect(page).toHaveURL(/\/routine\/running-records$/);
  await expect(page.getByRole("region", { name: "이달 요약" })).toBeVisible();

  // 줄을 누르면 그 런닝 한 건의 상세 — 경로(선)·시간·페이스·칼로리.
  await page.getByRole("link", { name: /야외 런닝 .*km 상세 보기/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`/routine/running-records/${counted.id}$`));
  await expect(page.getByRole("heading", { name: /야외 런닝/ })).toBeVisible();
  await expect(page.getByRole("img", { name: "달린 경로" })).toBeVisible();
  await expect(page.getByText("평균 페이스")).toBeVisible();
  await expect(page.getByText(/^\d+kcal$/)).toBeVisible();

  // 날짜 기록의 런닝 칸도 같은 상세로 간다.
  await page.getByRole("link", { name: "이날 운동 기록 전체 보기" }).click();
  await expect(page.getByRole("heading", { name: "런닝 세션" })).toBeVisible();
  await page.getByRole("link", { name: /야외 런닝 .*km 상세 보기/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`/routine/running-records/${counted.id}$`));

  // 3km 고리 코스(점 60개, 1km 마다 페이스가 다름) → 상세에 경로 선과 1km 구간 3줄.
  const start = Date.now() - 20 * 60_000;
  // 반지름 ~478m 원 = 약 3km, 한 칸 50m. 칸당 18초·21초·19초 → 1km 구간 6'00" / 7'00" / 6'20".
  const stepSec = (k: number) => (k < 20 ? 18 : k < 40 ? 21 : 19);
  const loop = Array.from({ length: 61 }, (_, i) => {
    const a = (i / 60) * 2 * Math.PI;
    const elapsed = [...Array(i).keys()].reduce((s, k) => s + stepSec(k), 0);
    return { lat: 37.5665 + 0.004298 * Math.sin(a), lng: 126.978 + 0.005419 * Math.cos(a), timestamp: start + elapsed * 1000, accuracyM: 8 };
  });
  const [seeded] = await dbQuery<{ id: string }>(
    `insert into public.run_sessions (user_id,client_session_id,for_date,mode,started_at,ended_at,duration_sec,distance_m,avg_kmh,pace_sec_per_km,calories_kcal,route_points)
     values (${uid},gen_random_uuid(),(now() at time zone 'Asia/Seoul')::date,'outdoor',to_timestamp($2/1000.0),to_timestamp($3/1000.0),$4,3000,9.2,387,210,$5::jsonb)
     returning id`,
    [email, loop[0].timestamp, loop[60].timestamp, Math.round((loop[60].timestamp - loop[0].timestamp) / 1000), JSON.stringify(loop)],
  );
  await page.goto(`/routine/running-records/${seeded.id}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("img", { name: "달린 경로" })).toBeVisible();
  const splits = page.getByRole("region", { name: "1km 구간 페이스" });
  await expect(splits.getByRole("listitem")).toHaveCount(3);
  await expect(splits).toContainText("6'00\"");
  await expect(splits).toContainText("7'00\"");
  await page.screenshot({ path: test.info().outputPath("running-detail.png"), fullPage: true });
  await page.goto("/routine/running-records", { waitUntil: "networkidle" });
  await page.screenshot({ path: test.info().outputPath("running-list.png"), fullPage: true });

  // 남의 기록/없는 id 는 404 화면(loading.tsx 스트리밍이라 상태코드는 200 — 화면으로 확인).
  await page.goto("/routine/running-records/c432b98c-51b6-49eb-9172-5b55553f883c");
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();
  await expect(page.getByRole("img", { name: "달린 경로" })).toHaveCount(0);
});
