"use client";

import { getHealthPlugin, isNative, withTimeout, type HealthRecord } from "@/features/health/health-plugin";
import { getHealthFeature, isFeatureGranted, permissionsFor } from "@/features/health/health-features";

const MIN_SLEEP_MS = 30 * 60 * 1000;
const MAX_SLEEP_MS = 16 * 60 * 60 * 1000;

export type SleepRecovery = {
  durationMinutes: number;
  level: "low" | "moderate" | "good" | "long";
  label: string;
};

function timestamp(value: unknown): number | null {
  const ms = value instanceof Date ? value.getTime() : new Date(value as string | number).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** 가장 최근에 끝난 유효한 수면 세션 하나를 회복 안내로 바꾼다. */
export function latestSleepRecovery(records: readonly HealthRecord[], nowMs = Date.now()): SleepRecovery | null {
  const sessions = records.flatMap((record) => {
    const start = timestamp(record.startTime);
    const end = timestamp(record.endTime);
    if (start === null || end === null || end > nowMs) return [];
    const duration = end - start;
    if (duration < MIN_SLEEP_MS || duration > MAX_SLEEP_MS) return [];
    return [{ end, durationMinutes: Math.round(duration / 60_000) }];
  });
  const latest = sessions.sort((a, b) => b.end - a.end)[0];
  if (!latest) return null;
  if (latest.durationMinutes < 360) return { ...latest, level: "low", label: "회복 부족" };
  if (latest.durationMinutes < 420) return { ...latest, level: "moderate", label: "회복 보통" };
  if (latest.durationMinutes <= 540) return { ...latest, level: "good", label: "회복 충분" };
  return { ...latest, level: "long", label: "긴 수면" };
}

export async function readLatestSleepRecovery(): Promise<
  { ok: true; recovery: SleepRecovery | null } | { ok: false; reason: string }
> {
  if (!(await isNative())) return { ok: false, reason: "앱(네이티브)에서만 동작합니다" };
  const HC = await withTimeout(getHealthPlugin(), 4000, null);
  if (!HC) return { ok: false, reason: "Health Connect 플러그인 로드 실패" };

  const feature = getHealthFeature("sleep")!;
  const permissions = permissionsFor(["sleep"]);
  const granted = await withTimeout(
    (async () => HC.checkHealthPermissions?.(permissions))(), 3500, undefined,
  );
  if (!isFeatureGranted(feature, granted?.grantedPermissions ?? [])) {
    return { ok: false, reason: "수면 권한이 허용되지 않았어요" };
  }

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 48 * 60 * 60 * 1000);
  try {
    const result = await withTimeout(
      HC.readRecords({ type: "SleepSession", timeRangeFilter: { type: "between", startTime, endTime } }),
      6000,
      { records: [] as HealthRecord[] },
    );
    return { ok: true, recovery: latestSleepRecovery(result.records ?? [], endTime.getTime()) };
  } catch (error) {
    return { ok: false, reason: "오류: " + (error instanceof Error ? error.message : String(error)) };
  }
}

export function formatSleepRecovery(recovery: SleepRecovery): string {
  const hours = Math.floor(recovery.durationMinutes / 60);
  const minutes = recovery.durationMinutes % 60;
  return `최근 수면 ${hours}시간${minutes ? ` ${minutes}분` : ""} · ${recovery.label}`;
}
