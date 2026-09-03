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

// AndroidX Health Connect ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING.
export const STRENGTH_TRAINING_EXERCISE_TYPE = 70;

export function workoutSessionRecord(
  endedAtMs: number,
  durationSec: number,
  sessionId?: string,
): HealthWriteRecord | null {
  if (!Number.isFinite(endedAtMs) || !Number.isFinite(durationSec)) return null;
  const seconds = Math.round(durationSec);
  if (seconds < 60 || seconds > 24 * 60 * 60) return null;
  const endedAt = new Date(endedAtMs);
  const startedAt = new Date(endedAtMs - seconds * 1_000);
  if (!Number.isFinite(endedAt.getTime()) || !Number.isFinite(startedAt.getTime())) return null;
  return {
    type: "ExerciseSession",
    startTime: startedAt,
    endTime: endedAt,
    title: "헬쑤 근력운동",
    exerciseType: STRENGTH_TRAINING_EXERCISE_TYPE,
    ...(sessionId
      ? {
          metadata: {
            clientRecordId: `helssu-workout-${sessionId}`,
            clientRecordVersion: 1,
            recordingMethod: "manualEntry" as const,
          },
        }
      : {}),
  };
}

export type WorkoutWriteResult =
  | { ok: true; written: boolean }
  | { ok: false; reason: string };

/** 사용자가 쓰기 권한을 연결한 경우에만 조용히 내보낸다. */
export async function writeWorkoutSession(
  endedAtMs: number,
  durationSec: number,
  sessionId?: string,
): Promise<WorkoutWriteResult> {
  const record = workoutSessionRecord(endedAtMs, durationSec, sessionId);
  if (!record) return { ok: false, reason: "저장할 수 없는 운동 시간" };
  if (!(await isNative())) return { ok: true, written: false };
  const HC = await withTimeout(getHealthPlugin(), 4_000, null);
  if (!HC?.insertRecords || !HC.checkHealthPermissions) {
    return { ok: false, reason: "Health Connect 쓰기를 지원하지 않아요" };
  }
  const feature = getHealthFeature("workout");
  if (!feature) return { ok: false, reason: "운동 연동 항목이 없어요" };
  const perms = permissionsFor(["workout"]);
  const granted = await withTimeout(
    HC.checkHealthPermissions(perms),
    3_500,
    undefined,
  );
  if (!isFeatureGranted(feature, granted?.grantedPermissions ?? [])) {
    return { ok: true, written: false };
  }
  const result = await withTimeout(
    HC.insertRecords({ records: [record] }),
    6_000,
    null,
  );
  return result
    ? { ok: true, written: true }
    : { ok: false, reason: "운동 세션 쓰기 실패" };
}
