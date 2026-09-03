"use client";

/**
 * 항목별 Health Connect 연동 — 로드맵 6.1.
 *
 * 걸음수 전용이던 브리지(`steps-native.ts`)와 **같은 밑바닥**(`health-plugin.ts`)을 쓰되,
 * 여기서는 항목표(`health-features.ts`)가 시키는 권한만 다룬다.
 *
 * 지키는 규칙(전부 실기기에서 데인 것):
 *  - 진입 시엔 **확인만**. 권한 요청(액티비티)은 사용자가 버튼을 눌렀을 때만.
 *  - 모든 네이티브 호출에 타임아웃. 먹통이어도 화면은 살아 있어야 한다.
 *  - 실패는 던지지 않고 **사유 문자열**로 돌려준다 — 화면에 그대로 띄워 침묵실패를 막는다.
 */

import {
  getHealthPlugin,
  isNative,
  withTimeout,
  type HealthConnectLike,
  type HealthRecord,
} from "@/features/health/health-plugin";
import {
  getHealthFeature,
  isFeatureGranted,
  permissionsFor,
  readyFeatures,
  type HealthFeatureId,
} from "@/features/health/health-features";
import { toBodyEntries, type BodyEntry } from "@/features/health/body-import";
import { reportAppEvent } from "@/lib/observability/report-client";

/** 체중·체성분을 얼마나 거슬러 읽을까 — 그래프가 끊기지 않을 만큼만. */
const BODY_BACKFILL_DAYS = 30;

export type HealthAvailability =
  /** 웹 — 연동 자체가 없는 환경. 화면은 '앱에서만 됩니다'만 알린다. */
  | { kind: "web" }
  /** 앱인데 Health Connect 를 못 쓴다(미설치·미지원·플러그인 실패). */
  | { kind: "unavailable"; reason: string }
  /** 쓸 수 있다 — 항목별 허용 여부까지. */
  | { kind: "available"; grantedIds: HealthFeatureId[] };

/**
 * 지금 이 기기에서 무엇이 되는지. **권한창을 띄우지 않는다**(진입 시 호출용).
 */
export async function getHealthAvailability(): Promise<HealthAvailability> {
  if (!(await isNative())) return { kind: "web" };

  const HC = await withTimeout(getHealthPlugin(), 4000, null);
  if (!HC) return { kind: "unavailable", reason: "Health Connect 플러그인을 불러오지 못했어요" };

  const avail = await withTimeout(
    (async () => HC.checkAvailability?.())(),
    3500,
    undefined,
  );
  if (avail && avail.availability !== "Available") {
    return {
      kind: "unavailable",
      reason:
        avail.availability === "NotInstalled"
          ? "Health Connect 설치/업데이트가 필요해요"
          : "이 기기는 Health Connect 를 지원하지 않아요",
    };
  }

  // 지금 동작하는 항목의 권한만 한 번에 확인한다(요청이 아니라 확인이라 창이 안 뜬다).
  const ready = readyFeatures();
  const perms = permissionsFor(ready.map((f) => f.id));
  const res = await withTimeout(
    (async () => HC.checkHealthPermissions?.(perms))(),
    3500,
    undefined,
  );
  const granted = res?.grantedPermissions ?? [];
  return {
    kind: "available",
    grantedIds: ready.filter((f) => isFeatureGranted(f, granted)).map((f) => f.id),
  };
}

export type HealthRequestResult =
  | { ok: true; id: HealthFeatureId }
  | { ok: false; reason: string };

/**
 * 🔴 **켠 항목의 권한만** 요청한다(점진적 권한). 사용자가 그 버튼을 눌렀을 때만 부른다.
 *
 * 실패는 관측에도 남긴다(로드맵 1.3) — 화면에만 띄우면 어떤 기기에서 왜 못 붙는지
 * 우리가 알 방법이 없다. 남기는 건 **사용자가 직접 눌렀을 때뿐**이라 쓰레기 행이 안 쌓인다.
 */
export async function requestHealthFeature(
  id: HealthFeatureId,
): Promise<HealthRequestResult> {
  const res = await requestHealthFeatureInner(id);
  if (!res.ok) {
    reportAppEvent("health_permission_failure", {
      message: `${id}: ${res.reason}`,
    });
  }
  return res;
}

async function requestHealthFeatureInner(
  id: HealthFeatureId,
): Promise<HealthRequestResult> {
  const feature = getHealthFeature(id);
  if (!feature) return { ok: false, reason: "알 수 없는 항목" };
  if (feature.status !== "ready") {
    // 아직 안 쓰는 권한을 미리 받아 두지 않는다.
    return { ok: false, reason: "아직 준비 중인 항목이에요" };
  }
  if (!(await isNative())) return { ok: false, reason: "앱(네이티브)에서만 동작합니다" };

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
    const perms = permissionsFor([id]);
    const res = await HC.requestHealthPermissions?.(perms);
    const granted = res?.grantedPermissions ?? [];
    if (!isFeatureGranted(feature, granted)) {
      // 일부만 허용된 경우도 여기로 온다 — '연결됨'으로 보이면 한 줄이 영영 안 채워진다.
      return { ok: false, reason: `${feature.label} 권한이 모두 허용되지 않았어요` };
    }
    return { ok: true, id };
  } catch (e) {
    return { ok: false, reason: "오류: " + (e instanceof Error ? e.message : String(e)) };
  }
}

export type BodyReadResult =
  | { ok: true; entries: BodyEntry[] }
  | { ok: false; reason: string };

/**
 * 체중·체지방·근육량을 읽어 앱 저장 모양으로. **권한창을 띄우지 않는다** —
 * 이미 허용된 상태에서만 값이 온다(허용 전이면 빈 목록).
 */
export async function readBodyEntries(
  days = BODY_BACKFILL_DAYS,
): Promise<BodyReadResult> {
  if (!(await isNative())) return { ok: false, reason: "앱(네이티브)에서만 동작합니다" };
  const HC = await withTimeout(getHealthPlugin(), 4000, null);
  if (!HC) return { ok: false, reason: "Health Connect 플러그인 로드 실패" };

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  const range = { type: "between", startTime: start, endTime: now };

  const read = async (type: string): Promise<HealthRecord[]> => {
    const res = await withTimeout(
      HC.readRecords({ type, timeRangeFilter: range }),
      6000,
      { records: [] as HealthRecord[] },
    );
    return res?.records ?? [];
  };

  try {
    // 세 종류를 **동시에** — 순서대로 기다리면 느린 기기에서 체감이 세 배가 된다.
    const [weight, bodyFat, leanMass] = await Promise.all([
      read("Weight"),
      read("BodyFat"),
      read("LeanBodyMass"),
    ]);
    return { ok: true, entries: toBodyEntries({ weight, bodyFat, leanMass }) };
  } catch (e) {
    return { ok: false, reason: "오류: " + (e instanceof Error ? e.message : String(e)) };
  }
}

/** 타입만 재노출 — 화면이 밑바닥 모듈을 직접 알 필요는 없다. */
export type { HealthConnectLike };
