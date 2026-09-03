"use client";

/**
 * Health Connect 브리지의 **공용 밑바닥** — 걸음수만 쓰던 것을 여러 건강 항목이
 * 같이 쓰게 뽑아냈다(로드맵 6.1).
 *
 * 여기 있는 규칙은 전부 실제 기기에서 데인 것들이라, 새 항목을 붙일 때도 그대로 따른다.
 *  1) **자동으로 권한창을 띄우지 않는다.** 액티비티가 뜨면서 네이티브 크래시가 났다.
 *     진입 시엔 '이미 허용됐나'만 확인하고(안전), 요청은 사용자가 눌렀을 때만.
 *  2) **모든 네이티브 호출에 타임아웃.** 플러그인이 콜백을 안 돌려주면 화면이 통째로
 *     멈춘다(버튼도 안 뜸). 시간이 지나면 폴백으로 넘어가 UI 는 계속 살아 있게 한다.
 *  3) **UA 표식으로도 앱을 판별한다.** 외부 server.url 로드 시 `window.Capacitor` 주입이
 *     실패하는 버그(ionic-team/capacitor#7269)가 있어, 브리지만 믿으면 앱에서 기능이
 *     통째로 사라진다.
 */

/**
 * capacitor.config.ts 의 appendUserAgent 로 심는 표식. 값이 config 와 반드시 일치해야 한다.
 */
const NATIVE_UA_MARK = "helssu-app";

/** User-Agent 에 네이티브 앱 표식이 있는지(브리지 주입과 무관하게 앱 여부 판별). */
export function hasNativeUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.includes(NATIVE_UA_MARK);
}

/** `window.Capacitor` 가 실제로 주입돼 있나 — #7269 판별용으로 UA 와 분리해서 본다. */
export function hasCapacitorBridge(): boolean {
  if (typeof window === "undefined") return false;
  // 네이티브 앱이면(UA 표식) 브리지가 없어도 true — 앱엔 주소창이 없어 쿼리스트링으로
  // 진단을 켤 수 없으니, 앱에서는 진단이 자동으로 보여야 한다.
  if (hasNativeUa()) return true;
  return !!(window as unknown as { Capacitor?: unknown }).Capacitor;
}

/**
 * 네이티브 호출이 '먹통'이 되면 화면 전체가 멈춘다. ms 안에 안 끝나면 fallback 으로
 * 넘어가 UI 가 계속 뜨게 한다. **거부(reject)도 fallback 으로 삼킨다** — 건강 연동
 * 실패가 앱 기능을 막으면 안 된다.
 */
export function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false;
    const t = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(fallback);
      }
    }, ms);
    p.then(
      (v) => {
        if (!done) {
          done = true;
          clearTimeout(t);
          resolve(v);
        }
      },
      () => {
        if (!done) {
          done = true;
          clearTimeout(t);
          resolve(fallback);
        }
      },
    );
  });
}

export async function isNative(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  // UA 표식이 있으면 네이티브 앱 확정(window.Capacitor 주입 실패해도 앱은 앱).
  if (hasNativeUa()) return true;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** 마지막 플러그인 획득 실패 사유(진단칩에 그대로 노출). */
let lastPluginError = "";

export function lastHealthPluginError(): string {
  return lastPluginError;
}

/** Health Connect 플러그인이 실제로 노출하는 것 중 이 앱이 쓰는 부분만. */
export type HealthConnectLike = {
  checkAvailability?: () => Promise<{ availability: string }>;
  checkHealthPermissions?: (opts: {
    read: string[];
    write: string[];
  }) => Promise<{ grantedPermissions?: string[]; hasAllPermissions?: boolean }>;
  requestHealthPermissions?: (opts: {
    read: string[];
    write: string[];
  }) => Promise<{ grantedPermissions?: string[]; hasAllPermissions?: boolean }>;
  insertRecords?: (opts: {
    records: HealthWriteRecord[];
  }) => Promise<{ recordIds?: string[] }>;
  aggregateSteps?: (opts: {
    timeRangeFilter: { type: string; startTime: Date; endTime: Date };
  }) => Promise<{ count?: number | string }>;
  readRecords: (opts: {
    type: string;
    timeRangeFilter: { type: string; startTime: Date; endTime: Date };
  }) => Promise<{
    records?: HealthRecord[];
  }>;
};

export type HealthWriteRecord =
  | {
      type: "ExerciseSession";
      startTime: Date;
      endTime: Date;
      title?: string;
      notes?: string;
      exerciseType: number;
      metadata?: {
        clientRecordId: string;
        clientRecordVersion?: number;
        recordingMethod?: "manualEntry";
      };
    }
  | {
      type: "Distance";
      startTime: Date;
      endTime: Date;
      distance: { unit: "meter"; value: number };
    }
  | {
      type: "TotalCaloriesBurned";
      startTime: Date;
      endTime: Date;
      energy: { unit: "kcal"; value: number };
    };

/** 읽어 온 레코드 한 건 — 항목마다 채워지는 필드가 달라 전부 선택 필드다. */
export type HealthRecord = {
  count?: number | string;
  startTime?: string | number | Date;
  endTime?: string | number | Date;
  time?: string | number | Date;
  /** 체중·제지방량 등은 `{ inKilograms }` 형태로 온다. */
  weight?: { inKilograms?: number | string } | number | string | null;
  mass?: { inKilograms?: number | string } | number | string | null;
  /** 체지방률(%). */
  percentage?: number | string | null;
  samples?: Array<{
    time?: string | number | Date;
    beatsPerMinute?: number | string;
  }>;
  metadata?: { dataOrigin?: string | null } | null;
};

export async function getHealthPlugin(): Promise<HealthConnectLike | null> {
  if (typeof window === "undefined") return null;
  // 동적 import(@capacitor/core)가 앱에서 멈추는(hang) 경우가 있어, 이미 주입된
  // window.Capacitor 를 직접 쓴다. 네이티브가 등록한 플러그인은 Capacitor.Plugins 아래.
  const cap = (
    window as unknown as {
      Capacitor?: {
        Plugins?: Record<string, HealthConnectLike | undefined>;
        registerPlugin?: (name: string) => HealthConnectLike;
      };
    }
  ).Capacitor;
  if (!cap) {
    lastPluginError = "window.Capacitor 없음";
    return null;
  }
  try {
    const hc =
      cap.Plugins?.HealthConnect ?? cap.registerPlugin?.("HealthConnect");
    if (!hc) {
      lastPluginError =
        "HealthConnect 미등록 (Plugins: " +
        Object.keys(cap.Plugins ?? {}).join(",") +
        ")";
      return null;
    }
    lastPluginError = "";
    return hc;
  } catch (e) {
    lastPluginError = e instanceof Error ? e.message : String(e);
    return null;
  }
}
