"use client";

/**
 * 네이티브(안드로이드) Health Connect 걸음수 브리지.
 * - 웹/미지원/미설치 환경에선 안전하게 무동작(크래시 없음).
 * - ⚠️ 권한요청(requestHealthPermissions)은 액티비티를 띄우므로 '자동'으로 부르지 않는다.
 *   (마이페이지 진입 시 자동 권한요청이 네이티브 크래시를 유발했음.) 사용자가 버튼을
 *   눌렀을 때만 요청한다. 진입 시엔 '이미 허용됐는지'만 확인(checkHealthPermissions, 안전).
 */

const HC_PLUGIN = "@kiwi-health/capacitor-health-connect";
const STEPS_READ = "Steps";

export type StepsState =
  | { status: "unavailable" }
  | { status: "denied" }
  | { status: "granted"; steps: number };

async function getPlugin(): Promise<HealthConnectLike | null> {
  if (typeof window === "undefined") return null;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return null;
    const spec: string = HC_PLUGIN; // string 변수 → 웹 번들에 정적 포함 안 됨
    const mod = (await import(spec).catch(() => null)) as {
      HealthConnect?: HealthConnectLike;
    } | null;
    return mod?.HealthConnect ?? null;
  } catch {
    return null;
  }
}

/**
 * 진입 시 상태 판정의 '순수' 부분(웹/네이티브·플러그인·권한 → 표시상태).
 * 핵심 규칙: **웹에서만 숨긴다(unavailable). 네이티브면 권한 전이라도 항상 버튼을 보여준다(denied)**
 * — 그래야 S23 같은 기기에서 '아무것도 안 뜨는' 침묵실패 없이 버튼을 눌러 사유를 볼 수 있다.
 */
export type StepsAvail =
  | "web" // 웹/비네이티브 → 숨김
  | "no-plugin" // 네이티브인데 플러그인 로드 실패 → 버튼(탭하면 사유)
  | "hc-unavailable" // Health Connect 미설치/미지원 → 버튼
  | "no-perm" // 권한 미허용 → 버튼
  | "ok"; // 권한 있음 → 걸음수 표시

export function decideStepsState(avail: StepsAvail, steps: number): StepsState {
  if (avail === "web") return { status: "unavailable" };
  if (avail === "ok") return { status: "granted", steps: steps > 0 ? steps : 0 };
  return { status: "denied" }; // no-plugin · hc-unavailable · no-perm → 네이티브면 버튼 노출
}

async function isNative(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Health Connect 사용 가능 + 걸음수 권한 보유 시 오늘 걸음수까지 읽는다. 액티비티는 안 띄움. */
export async function getStepsState(): Promise<StepsState> {
  if (!(await isNative())) return decideStepsState("web", 0);

  const HC = await getPlugin();
  if (!HC) return decideStepsState("no-plugin", 0); // 네이티브인데 플러그인 없음 → 버튼
  try {
    const avail = await HC.checkAvailability?.();
    if (avail && avail.availability !== "Available")
      return decideStepsState("hc-unavailable", 0);

    const perm = await HC.checkHealthPermissions?.({
      read: [STEPS_READ],
      write: [],
    });
    const granted = !!perm && (perm.grantedPermissions?.length ?? 0) > 0;
    if (!granted) return decideStepsState("no-perm", 0);

    const steps = await readSteps(HC);
    return decideStepsState("ok", steps ?? 0);
  } catch {
    return decideStepsState("no-perm", 0); // 네이티브 오류 → 버튼(탭하면 사유)
  }
}

export type ConnectResult =
  | { ok: true; steps: number }
  | { ok: false; reason: string };

/**
 * 사용자 버튼 클릭 시에만 호출 — 권한 요청(액티비티) 후 걸음수 반환.
 * 실패 시 '이유'를 함께 돌려 화면에 표시해 디버깅 가능하게 한다.
 */
export async function connectSteps(): Promise<ConnectResult> {
  if (typeof window === "undefined") return { ok: false, reason: "웹 환경" };
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) {
      return { ok: false, reason: "앱(네이티브)에서만 동작합니다" };
    }
  } catch {
    return { ok: false, reason: "Capacitor 로드 실패" };
  }
  const HC = await getPlugin();
  if (!HC) return { ok: false, reason: "Health Connect 플러그인 로드 실패" };

  try {
    const avail = await HC.checkAvailability?.();
    if (avail && avail.availability !== "Available") {
      return {
        ok: false,
        reason:
          avail.availability === "NotInstalled"
            ? "Health Connect 설치/업데이트 필요"
            : "이 기기는 Health Connect 미지원",
      };
    }
    const res = await HC.requestHealthPermissions?.({
      read: [STEPS_READ],
      write: [],
    });
    if (!res || !res.hasAllPermissions) {
      return { ok: false, reason: "걸음수 권한이 허용되지 않았어요" };
    }
    const steps = (await readSteps(HC)) ?? 0;
    return { ok: true, steps };
  } catch (e) {
    return {
      ok: false,
      reason: "오류: " + (e instanceof Error ? e.message : String(e)),
    };
  }
}

/** 오늘(자정~지금) 누적 걸음수. */
async function readSteps(HC: HealthConnectLike): Promise<number | null> {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const res = await HC.readRecords({
    type: STEPS_READ,
    timeRangeFilter: { type: "between", startTime: start, endTime: now },
  });
  const records = res?.records ?? [];
  return records.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
}

// 플러그인 최소 타입(설치 안 돼 있어도 tsc 통과).
type HealthConnectLike = {
  checkAvailability?: () => Promise<{ availability: string }>;
  checkHealthPermissions?: (opts: {
    read: string[];
    write: string[];
  }) => Promise<{ grantedPermissions?: string[]; hasAllPermissions?: boolean }>;
  requestHealthPermissions?: (opts: {
    read: string[];
    write: string[];
  }) => Promise<{ grantedPermissions?: string[]; hasAllPermissions?: boolean }>;
  readRecords: (opts: {
    type: string;
    timeRangeFilter: { type: string; startTime: Date; endTime: Date };
  }) => Promise<{ records?: { count?: number | string }[] }>;
};
