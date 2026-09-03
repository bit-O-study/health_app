"use client";

import { getHealthPlugin, isNative, withTimeout, type HealthRecord } from "@/features/health/health-plugin";
import { getHealthFeature, isFeatureGranted, permissionsFor } from "@/features/health/health-features";

export type HeartRateSummary = { averageBpm: number; maxBpm: number; sampleCount: number };

export function summarizeHeartRate(
  records: readonly HealthRecord[],
  startedAt: Date,
  endedAt: Date,
): HeartRateSummary | null {
  const start = startedAt.getTime();
  const end = endedAt.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const unique = new Map<string, number>();
  for (const record of records) {
    for (const sample of record.samples ?? []) {
      const time = new Date(sample.time ?? Number.NaN).getTime();
      const bpm = Number(sample.beatsPerMinute);
      if (!Number.isFinite(time) || time < start || time > end) continue;
      if (!Number.isFinite(bpm) || bpm < 30 || bpm > 240) continue;
      unique.set(`${time}:${Math.round(bpm)}`, bpm);
    }
  }
  const values = [...unique.values()];
  if (values.length === 0) return null;
  return {
    averageBpm: Math.round(values.reduce((sum, bpm) => sum + bpm, 0) / values.length),
    maxBpm: Math.round(Math.max(...values)),
    sampleCount: values.length,
  };
}

export async function readRunHeartRate(
  startedAt: string,
  endedAt: string,
): Promise<{ ok: true; summary: HeartRateSummary | null } | { ok: false; reason: string }> {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    return { ok: false, reason: "잘못된 러닝 시간" };
  }
  if (!(await isNative())) return { ok: true, summary: null };
  const HC = await withTimeout(getHealthPlugin(), 4_000, null);
  if (!HC?.checkHealthPermissions) return { ok: false, reason: "Health Connect 읽기를 지원하지 않아요" };
  const feature = getHealthFeature("heartRate");
  if (!feature) return { ok: false, reason: "심박수 연동 항목이 없어요" };
  const permissions = permissionsFor(["heartRate"]);
  const granted = await withTimeout(HC.checkHealthPermissions(permissions), 3_500, undefined);
  if (!isFeatureGranted(feature, granted?.grantedPermissions ?? [])) {
    return { ok: true, summary: null };
  }
  const result = await withTimeout(
    HC.readRecords({
      type: "HeartRateSeries",
      timeRangeFilter: { type: "between", startTime: start, endTime: end },
    }),
    6_000,
    { records: [] },
  );
  return { ok: true, summary: summarizeHeartRate(result.records ?? [], start, end) };
}
