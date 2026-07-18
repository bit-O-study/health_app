import { describe, expect, it } from "vitest";

import {
  DEFAULT_HOLD_SEC,
  formatHold,
  holdSecondsFromReps,
  isTimedExercise,
  TIMED_EXERCISE_IDS,
} from "@/features/routine/timed-exercises";

describe("timed-exercises — 시간(초) 기반 운동", () => {
  it("플랭크류는 시간 기반, 나머지는 아님", () => {
    expect(isTimedExercise("plank")).toBe(true);
    expect(isTimedExercise("side-plank")).toBe(true);
    expect(isTimedExercise("hollow-hold")).toBe(true);
    expect(isTimedExercise("bench-press")).toBe(false);
    expect(isTimedExercise("sit-up")).toBe(false);
    expect(isTimedExercise(null)).toBe(false);
    expect(isTimedExercise(undefined)).toBe(false);
    expect(isTimedExercise("")).toBe(false);
  });

  it("등록된 시간 운동 집합", () => {
    expect(TIMED_EXERCISE_IDS.has("plank")).toBe(true);
    expect(TIMED_EXERCISE_IDS.size).toBeGreaterThanOrEqual(3);
  });

  it("reps → 홀드 초(범위 보정, 벗어나면 기본값)", () => {
    expect(holdSecondsFromReps(30)).toBe(30);
    expect(holdSecondsFromReps(60)).toBe(60);
    expect(holdSecondsFromReps(4)).toBe(DEFAULT_HOLD_SEC); // 너무 작음
    expect(holdSecondsFromReps(999)).toBe(DEFAULT_HOLD_SEC); // 너무 큼
    expect(holdSecondsFromReps(null)).toBe(DEFAULT_HOLD_SEC);
    expect(holdSecondsFromReps(NaN)).toBe(DEFAULT_HOLD_SEC);
    expect(holdSecondsFromReps(45.4)).toBe(45);
  });

  it("초 포맷 m:ss", () => {
    expect(formatHold(30)).toBe("0:30");
    expect(formatHold(90)).toBe("1:30");
    expect(formatHold(0)).toBe("0:00");
    expect(formatHold(-5)).toBe("0:00");
  });
});
