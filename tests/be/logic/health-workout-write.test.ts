import { describe, expect, it } from "vitest";

import {
  STRENGTH_TRAINING_EXERCISE_TYPE,
  workoutSessionRecord,
} from "@/features/health/workout-write";

describe("Health Connect ExerciseSession", () => {
  it("종료 시각과 실제 누적 시간으로 근력운동 세션을 만든다", () => {
    const endedAt = Date.parse("2026-09-02T03:00:00.000Z");
    const record = workoutSessionRecord(endedAt, 3_600);
    expect(record).toMatchObject({
      type: "ExerciseSession",
      title: "헬쑤 근력운동",
      exerciseType: STRENGTH_TRAINING_EXERCISE_TYPE,
    });
    expect(record?.startTime.toISOString()).toBe("2026-09-02T02:00:00.000Z");
    expect(record?.endTime.toISOString()).toBe("2026-09-02T03:00:00.000Z");
  });

  it("60초 미만·24시간 초과·비정상 수치는 내보내지 않는다", () => {
    const now = Date.now();
    expect(workoutSessionRecord(now, 59)).toBeNull();
    expect(workoutSessionRecord(now, 86_401)).toBeNull();
    expect(workoutSessionRecord(Number.NaN, 60)).toBeNull();
    expect(workoutSessionRecord(now, Number.POSITIVE_INFINITY)).toBeNull();
  });
});
