import type { Page } from "@playwright/test";

/**
 * 런닝 E2E 공용 — 가짜 GPS(시간 앞당기기·위치 보내기·위치 오류)와 '꾹 눌러 종료'.
 * (2026-09-28 런닝 2단계: 종료는 1초 꾹 눌러야 끝난다 — click 으로는 안 끝난다.)
 */
export async function fakeGps(page: Page, opts: { wakeLock?: boolean; speech?: boolean } = {}) {
  await page.addInitScript(({ withWakeLock, withSpeech }) => {
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
    // 음성·진동 기록(3단계 안내 검증용) — 말한 문장과 진동 횟수를 창에 남긴다.
    if (withSpeech) {
      w.__spoken = [] as string[];
      w.__buzz = 0;
      class FakeUtterance { text: string; lang = ""; rate = 1; constructor(t: string) { this.text = t; } }
      Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: { cancel: () => {}, speak: (u: { text: string }) => (w.__spoken as string[]).push(u.text) },
      });
      Object.defineProperty(navigator, "vibrate", { configurable: true, value: () => { (w.__buzz as number)++; return true; } });
    }
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
  }, { withWakeLock: opts.wakeLock ?? false, withSpeech: opts.speech ?? false });
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

/** 약 100m 씩, 10초 간격으로 n 번 이동(초속 10m — 달리는 속도, 튐 필터 안). 경도 기준점부터. */
export async function runSteps(page: Page, n: number, fromLongitude = 126.978) {
  let lng = fromLongitude;
  for (let i = 0; i < n; i++) {
    lng += 0.001135; // 위도 37.57° 에서 약 100m
    await runCall(page, "__advanceRunTime", 10_000);
    await runCall(page, "__pushRunPosition", lng);
    await page.waitForTimeout(120);
  }
  return lng;
}

export async function spoken(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __spoken?: string[] }).__spoken ?? []);
}
