"use client";

import {
  getHealthPlugin,
  isNative,
  withTimeout,
  type HealthWriteRecord,
} from "@/features/health/health-plugin";
import {
  getHealthFeature,
  isFeatureGranted,
  permissionsFor,
} from "@/features/health/health-features";

export type RunHealthInput = {
  startedAt: string;
  endedAt: string;
  distanceM: number;
  caloriesKcal: number;
};

export function runHealthRecords(input: RunHealthInput): HealthWriteRecord[] {
  const startedAt = new Date(input.startedAt);
  const endedAt = new Date(input.endedAt);
  const durationMs = endedAt.getTime() - startedAt.getTime();
  if (
    !Number.isFinite(startedAt.getTime()) ||
    !Number.isFinite(endedAt.getTime()) ||
    durationMs < 60_000 ||
    durationMs > 24 * 60 * 60 * 1_000 ||
    !Number.isFinite(input.distanceM) ||
    input.distanceM < 0 ||
    input.distanceM > 200_000 ||
    !Number.isFinite(input.caloriesKcal) ||
    input.caloriesKcal < 0 ||
    input.caloriesKcal > 20_000
  ) return [];

  const records: HealthWriteRecord[] = [];
  if (input.distanceM > 0) {
    records.push({
      type: "Distance",
      startTime: startedAt,
      endTime: endedAt,
      distance: { unit: "meter", value: Math.round(input.distanceM) },
    });
  }
  if (input.caloriesKcal > 0) {
    records.push({
      type: "TotalCaloriesBurned",
      startTime: startedAt,
      endTime: endedAt,
      energy: { unit: "kcal", value: Math.round(input.caloriesKcal) },
    });
  }
  return records;
}

export async function writeRunHealthRecords(
  input: RunHealthInput,
): Promise<{ ok: boolean; written: boolean; reason?: string }> {
  const records = runHealthRecords(input);
  if (records.length === 0) return { ok: false, written: false, reason: "내보낼 러닝 기록이 없어요" };
  if (!(await isNative())) return { ok: true, written: false };
  const HC = await withTimeout(getHealthPlugin(), 4_000, null);
  if (!HC?.insertRecords || !HC.checkHealthPermissions) {
    return { ok: false, written: false, reason: "Health Connect 쓰기를 지원하지 않아요" };
  }
  const feature = getHealthFeature("run");
  if (!feature) return { ok: false, written: false, reason: "러닝 연동 항목이 없어요" };
  const permissions = permissionsFor(["run"]);
  const granted = await withTimeout(
    HC.checkHealthPermissions(permissions),
    3_500,
    undefined,
  );
  if (!isFeatureGranted(feature, granted?.grantedPermissions ?? [])) {
    return { ok: true, written: false };
  }
  const result = await withTimeout(
    HC.insertRecords({ records }),
    6_000,
    null,
  );
  return result
    ? { ok: true, written: true }
    : { ok: false, written: false, reason: "러닝 기록 쓰기 실패" };
}
