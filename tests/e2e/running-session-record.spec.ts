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
  await expect(page.getByText(/위치 정보\(GPS\)가 꺼져 있어요/)).toBeVisible();
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

  await page.goto("/settings/history", { waitUntil: "networkidle" });
  await expect(page.getByText("이번 주 런닝")).toBeVisible();
  await expect(page.getByRole("heading", { name: "최근 런닝 기록" })).toBeVisible();
  await expect(page.getByText("야외 런닝").first()).toBeVisible();
  await expect(page.getByText(/경로 \d+점/).first()).toBeVisible();

  await page.getByText("야외 런닝").first().click();
  await expect(page.getByRole("heading", { name: "런닝 세션" })).toBeVisible();
  await expect(page.getByText("야외 런닝").first()).toBeVisible();
});
