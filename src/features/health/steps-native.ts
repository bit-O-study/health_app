"use client";

/**
 * 네이티브(안드로이드) Health Connect 에서 오늘 걸음수를 읽는 브리지.
 * - 웹/미지원 환경에선 항상 null (no-op) → 웹 빌드·동작에 영향 없음.
 * - 플러그인(@kiwi-health/capacitor-health-connect)은 네이티브 빌드에만 설치(설정 스크립트).
 *   웹 번들에 안 들어가도록 string 변수로 동적 import 한다.
 *
 * 삼성헬스가 걸음수를 Health Connect 에 기록하므로, Health Connect 읽기로 가져온다.
 */

const HC_PLUGIN = "@kiwi-health/capacitor-health-connect";

export async function isNativeHealthAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** 오늘(자정~지금) 누적 걸음수. 실패/미지원 시 null. */
export async function readTodaySteps(): Promise<number | null> {
  if (!(await isNativeHealthAvailable())) return null;
  try {
    // string 변수 → tsc/번들러가 모듈을 정적으로 해석하지 않음(웹 빌드 안전).
    const spec: string = HC_PLUGIN;
    const mod = (await import(spec).catch(() => null)) as {
      HealthConnect?: HealthConnectLike;
    } | null;
    const HC = mod?.HealthConnect;
    if (!HC) return null;

    // ⚠️ Health Connect 미설치/미지원 기기(에뮬레이터·구형폰)에서 권한요청·읽기를 바로
    //    호출하면 네이티브가 죽는다. 먼저 안전한 가용성 체크로 게이트한다.
    try {
      const avail = await HC.checkAvailability?.();
      if (avail && avail.availability !== "Available") return null;
    } catch {
      return null;
    }

    // 권한 보장(이미 허용돼 있으면 무시).
    try {
      await HC.requestHealthPermissions?.({ read: ["Steps"], write: [] });
    } catch {
      /* 사용자가 거부했거나 이미 처리됨 */
    }

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    // @kiwi-health/capacitor-health-connect: timeRangeFilter 는 Date 를 받는다(브리지가 직렬화).
    const res = await HC.readRecords({
      type: "Steps",
      timeRangeFilter: {
        type: "between",
        startTime: start,
        endTime: now,
      },
    });
    const records = res?.records ?? [];
    const total = records.reduce(
      (sum, r) => sum + (Number(r.count) || 0),
      0,
    );
    return total;
  } catch {
    return null;
  }
}

// 플러그인 최소 타입(설치 안 돼 있어도 tsc 통과).
type HealthConnectLike = {
  checkAvailability?: () => Promise<{ availability: string }>;
  requestHealthPermissions?: (opts: {
    read: string[];
    write: string[];
  }) => Promise<unknown>;
  readRecords: (opts: {
    type: string;
    timeRangeFilter: { type: string; startTime: Date; endTime: Date };
  }) => Promise<{ records?: { count?: number | string }[] }>;
};
