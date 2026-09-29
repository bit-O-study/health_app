import type { Page } from "@playwright/test";

/**
 * 런닝 E2E 공용 — 가짜 GPS(시간 앞당기기·위치 보내기·위치 오류)와 '꾹 눌러 종료'.
 * (2026-09-28 런닝 2단계: 종료는 1초 꾹 눌러야 끝난다 — click 으로는 안 끝난다.)
 */
export async function fakeGps(page: Page, opts: { wakeLock?: boolean } = {}) {
  await page.addInitScript((withWakeLock) => {
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
    if (withWakeLock) {
      w.__wakeLockRequests = 0;
      Object.defineProperty(navigator, "wakeLock", {
        configurable: true,
        value: {
          request: async () => {
            (w.__wakeLockRequests as number)++;
            return { release: async () => {} };
          },
        },
      });
    }
  }, opts.wakeLock ?? false);
}

export async function runCall(page: Page, fn: string, arg: number) {
  await page.evaluate(([name, value]) => (window as unknown as Record<string, (v: number) => void>)[name]?.(value), [fn, arg] as const);
}

/** '꾹 눌러 종료'를 1.3초 누르고 뗀다. */
export async function holdToEnd(page: Page) {
  const button = page.getByRole("button", { name: "꾹 눌러 종료" });
  await button.scrollIntoViewIfNeeded();
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1300);
  await page.mouse.up();
}
