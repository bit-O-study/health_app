"use client";

/**
 * 네이티브(안드로이드) Health Connect 걸음수 브리지.
 * - 웹/미지원/미설치 환경에선 안전하게 무동작(크래시 없음).
 * - ⚠️ 권한요청(requestHealthPermissions)은 액티비티를 띄우므로 '자동'으로 부르지 않는다.
 *   (마이페이지 진입 시 자동 권한요청이 네이티브 크래시를 유발했음.) 사용자가 버튼을
 *   눌렀을 때만 요청한다. 진입 시엔 '이미 허용됐는지'만 확인(checkHealthPermissions, 안전).
 */

import {
  bucketStepsBySeoulDay,
  seoulYmdOf,
} from "@/features/health/steps-bucket";
// 플러그인 획득·타임아웃·앱 판별은 건강 항목 전체가 함께 쓴다(로드맵 6.1에서 분리).
// 여기 두면 항목이 늘 때마다 같은 코드가 복사되고, 실기기에서 데여 고친 규칙이 한쪽에만
// 반영되는 사고가 난다.
import {
  getHealthPlugin,
  hasCapacitorBridge as bridgePresent,
  hasNativeUa,
  isNative,
  lastHealthPluginError,
  withTimeout,
  type HealthConnectLike,
} from "@/features/health/health-plugin";
import { reportAppEvent } from "@/lib/observability/report-client";

const STEPS_READ = "Steps";
/** 진입/동기화 시 함께 백필할 과거 일수(캘린더가 서울 날짜별로 채워지게). */
const BACKFILL_DAYS = 7;
export type StepsState =
  | { status: "unavailable" }
  | { status: "denied" }
  | { status: "granted"; steps: number; byDay?: Record<string, number> };

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

/** Health Connect 사용 가능 + 걸음수 권한 보유 시 오늘 걸음수까지 읽는다. 액티비티는 안 띄움. */
export async function getStepsState(): Promise<StepsState> {
  if (!(await isNative())) return decideStepsState("web", 0);

  const HC = await withTimeout(getHealthPlugin(), 4000, null);
  if (!HC) return decideStepsState("no-plugin", 0); // 네이티브인데 플러그인 없음/먹통 → 버튼
  try {
    // 각 네이티브 호출에 타임아웃 — 먹통이면 '연동' 버튼이라도 뜨게 한다.
    const avail = await withTimeout(
      (async () => HC.checkAvailability?.())(),
      3500,
      undefined,
    );
    if (avail && avail.availability !== "Available")
      return decideStepsState("hc-unavailable", 0);

    const perm = await withTimeout(
      (async () => HC.checkHealthPermissions?.({ read: [STEPS_READ], write: [] }))(),
      3500,
      undefined,
    );
    const granted = !!perm && (perm.grantedPermissions?.length ?? 0) > 0;
    if (!granted) return decideStepsState("no-perm", 0);

    const byDay = await withTimeout(readStepsByDay(HC), 5000, {});
    const today = seoulYmdOf(new Date()) ?? "";
    const steps = byDay[today] ?? 0;
    return { status: "granted", steps: steps > 0 ? steps : 0, byDay };
  } catch {
    return decideStepsState("no-perm", 0); // 네이티브 오류 → 버튼(탭하면 사유)
  }
}

export type ConnectResult =
  | { ok: true; steps: number; byDay?: Record<string, number> }
  | { ok: false; reason: string };

/**
 * 사용자 버튼 클릭 시에만 호출 — 권한 요청(액티비티) 후 걸음수 반환.
 * 실패 시 '이유'를 함께 돌려 화면에 표시해 디버깅 가능하게 한다.
 *
 * 실패는 **관측에도 남긴다**(로드맵 1.3). 화면에만 띄우면 그 순간 사용자만 보고
 * 끝나서, 어떤 기기에서 어떤 사유로 못 붙는지 우리가 알 방법이 없었다.
 * 남기는 건 사용자가 **직접 버튼을 눌렀을 때뿐** — 진입할 때마다 도는 수동 확인
 * (`getStepsState`)까지 남기면 웹/미지원 기기에서 의미 없는 행만 쌓인다.
 */
export async function connectSteps(): Promise<ConnectResult> {
  const res = await connectStepsInner();
  if (!res.ok) {
    reportAppEvent("health_permission_failure", { message: res.reason });
  }
  return res;
}

async function connectStepsInner(): Promise<ConnectResult> {
  if (typeof window === "undefined") return { ok: false, reason: "웹 환경" };
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) {
      return { ok: false, reason: "앱(네이티브)에서만 동작합니다" };
    }
  } catch {
    return { ok: false, reason: "Capacitor 로드 실패" };
  }
  const HC = await getHealthPlugin();
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
    const byDay = await readStepsByDay(HC);
    const today = seoulYmdOf(new Date()) ?? "";
    return { ok: true, steps: byDay[today] ?? 0, byDay };
  } catch (e) {
    return {
      ok: false,
      reason: "오류: " + (e instanceof Error ? e.message : String(e)),
    };
  }
}

/**
 * 진단: 권한요청(액티비티) 없이 파이프라인의 각 단계 값을 그대로 수집한다.
 * 화면에 찍어 '어디서 0이 나오는지' 한 번에 가리기 위함(권한은 됐다는데 안 변할 때).
 */
export type StepsDiag = {
  ua: boolean; // UA 표식(helssu-app) — 새 APK 설치 여부
  bridge: boolean; // window.Capacitor 실제 주입 여부(#7269 확인용)
  native: boolean;
  plugin: boolean;
  availability: string | null;
  granted: string[] | null;
  recordCount: number | null;
  steps: number | null;
  error: string | null;
};

/** window.Capacitor 가 주입돼 있나 — 네이티브 WebView(앱) 안인지 빠르게 가린다. */
export const hasCapacitorBridge = bridgePresent;

export async function diagnoseSteps(): Promise<StepsDiag> {
  const d: StepsDiag = {
    ua: hasNativeUa(),
    // 실제 window.Capacitor 주입 여부(UA 표식과 분리해서 봐야 #7269 판별 가능).
    bridge:
      typeof window !== "undefined" &&
      !!(window as unknown as { Capacitor?: unknown }).Capacitor,
    native: false,
    plugin: false,
    availability: null,
    granted: null,
    recordCount: null,
    steps: null,
    error: null,
  };
  try {
    d.native = await isNative();
    if (!d.native) return d;
    const HC = await withTimeout(getHealthPlugin(), 4000, null);
    d.plugin = !!HC;
    if (!HC) {
      d.error = "플러그인:" + (lastHealthPluginError() || "로드 실패/시간초과");
      return d;
    }

    const avail = await withTimeout(
      (async () => HC.checkAvailability?.())(),
      3500,
      undefined,
    );
    d.availability = avail?.availability ?? "timeout";

    const perm = await withTimeout(
      (async () => HC.checkHealthPermissions?.({ read: [STEPS_READ], write: [] }))(),
      3500,
      undefined,
    );
    d.granted = perm?.grantedPermissions ?? [];
    if ((d.granted?.length ?? 0) === 0) return d; // 권한 없으면 읽기 생략

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (HC.aggregateSteps) {
      const res = await withTimeout(
        HC.aggregateSteps({
          timeRangeFilter: { type: "between", startTime: start, endTime: now },
        }),
        5000,
        { count: 0 },
      );
      d.recordCount = null;
      d.steps = Math.max(0, Number(res.count) || 0);
      return d;
    }
    const res = await withTimeout(
      HC.readRecords({
        type: STEPS_READ,
        timeRangeFilter: { type: "between", startTime: start, endTime: now },
      }),
      5000,
      { records: [] },
    );
    const records = res?.records ?? [];
    d.recordCount = records.length;
    // 표시와 동일하게 '출처별 중복 제거'된 오늘 걸음수(원시 합이 아니라).
    const todayYmd = seoulYmdOf(now) ?? "";
    d.steps = bucketStepsBySeoulDay(records, todayYmd)[todayYmd] ?? 0;
  } catch (e) {
    d.error = e instanceof Error ? e.message : String(e);
  }
  return d;
}

/** 진단칩 버전 — 앱이 새 코드를 실제로 불러왔는지(캐시 아님) 확인용. 배포마다 올린다. */
const STEPS_DIAG_VER = "v7";

/** 진단 결과를 한 줄 문자열로(화면 디버그용). */
export function formatStepsDiag(d: StepsDiag): string {
  const parts = [
    STEPS_DIAG_VER,
    `앱UA${d.ua ? "O" : "X"}`,
    `브릿지${d.bridge ? "O" : "X"}`,
    `네이티브${d.native ? "O" : "X"}`,
    `플러그인${d.plugin ? "O" : "X"}`,
    `HC=${d.availability ?? "-"}`,
    `권한=${d.granted ? d.granted.length : "-"}`,
    `레코드=${d.recordCount ?? "-"}`,
    `합계=${d.steps ?? "-"}`,
  ];
  if (d.error) parts.push(`오류:${d.error}`);
  return parts.join(" · ");
}

/**
 * 최근 BACKFILL_DAYS 일치 Steps 레코드를 읽어 **서울 날짜별** 합계 맵으로 반환.
 * (기존엔 오늘 하루만, 기기-로컬 자정 기준으로 합산했다. 이제 서울 날짜로 버킷팅해
 *  캘린더(서울 for_date)와 어긋나지 않게 하고, 과거 일자도 함께 채운다.)
 */
async function readStepsByDay(
  HC: HealthConnectLike,
  days = BACKFILL_DAYS,
): Promise<Record<string, number>> {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  if (HC.aggregateSteps) {
    const byDay: Record<string, number> = {};
    for (let day = new Date(start); day < now; day.setDate(day.getDate() + 1)) {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const end = nextDay < now ? nextDay : now;
      const result = await HC.aggregateSteps({
        timeRangeFilter: {
          type: "between",
          startTime: new Date(day),
          endTime: end,
        },
      });
      const ymd = seoulYmdOf(day);
      if (ymd) byDay[ymd] = Math.max(0, Number(result.count) || 0);
    }
    return byDay;
  }
  const res = await HC.readRecords({
    type: STEPS_READ,
    timeRangeFilter: { type: "between", startTime: start, endTime: now },
  });
  const todayYmd = seoulYmdOf(now) ?? "";
  return bucketStepsBySeoulDay(res?.records ?? [], todayYmd);
}
