import { describe, expect, it } from "vitest";

import {
  hasSubMuscleTraining,
  subMusclePointsFromTraining,
} from "@/features/routine/score";

const TODAY = "2026-06-04";

describe("subMusclePointsFromTraining (세부근육 단위 점수)", () => {
  it("기록 없으면 빈 맵 + hasSubMuscleTraining false", () => {
    const p = subMusclePointsFromTraining([], 70, TODAY);
    expect(Object.keys(p)).toHaveLength(0);
    expect(hasSubMuscleTraining(p)).toBe(false);
  });

  it("인클라인 컬 = 이두 장두에만 점수 (단두엔 0)", () => {
    const p = subMusclePointsFromTraining(
      [{ forDate: TODAY, exerciseId: "incline-curl", sets: 4, reps: 10, weightKg: 20 }],
      70,
      TODAY,
    );
    expect(p["arm-biceps-long"]).toBeGreaterThan(0);
    expect(p["arm-biceps-short"] ?? 0).toBe(0);
    expect(hasSubMuscleTraining(p)).toBe(true);
  });

  it("컨센트레이션 컬 = 이두 단두에만 점수 (장두엔 0)", () => {
    const p = subMusclePointsFromTraining(
      [{ forDate: TODAY, exerciseId: "concentration-curl", sets: 3, reps: 12, weightKg: 12 }],
      70,
      TODAY,
    );
    expect(p["arm-biceps-short"]).toBeGreaterThan(0);
    expect(p["arm-biceps-long"] ?? 0).toBe(0);
  });

  it("여러 세부근육을 치는 운동은 운동량을 균등 배분 (벤치프레스 = 중부+하부 대흉근 50%씩)", () => {
    const p = subMusclePointsFromTraining(
      [{ forDate: TODAY, exerciseId: "bench-press", sets: 5, reps: 5, weightKg: 100 }],
      70,
      TODAY,
    );
    // bench-press → chest-mid, chest-lower (2개) 균등
    expect(p["chest-mid"]).toBeGreaterThan(0);
    expect(p["chest-lower"]).toBeGreaterThan(0);
    expect(p["chest-mid"]).toBeCloseTo(p["chest-lower"], 6);
    // 합이 단일근육 운동의 동일 운동량과 같아야 (배분이라 총량 보존)
    const single = subMusclePointsFromTraining(
      [{ forDate: TODAY, exerciseId: "incline-curl", sets: 5, reps: 5, weightKg: 100 }],
      70,
      TODAY,
    )["arm-biceps-long"];
    expect(p["chest-mid"] + p["chest-lower"]).toBeCloseTo(single, 6);
  });

  it("exerciseId 없으면 제외", () => {
    const p = subMusclePointsFromTraining(
      [{ forDate: TODAY, exerciseId: null, sets: 4, reps: 10, weightKg: 50 }],
      70,
      TODAY,
    );
    expect(Object.keys(p)).toHaveLength(0);
  });

  it("오래된 기록일수록 반감기로 점수가 작아진다", () => {
    const fresh = subMusclePointsFromTraining(
      [{ forDate: TODAY, exerciseId: "incline-curl", sets: 4, reps: 10, weightKg: 20 }],
      70,
      TODAY,
    )["arm-biceps-long"];
    const old = subMusclePointsFromTraining(
      [{ forDate: "2026-05-21", exerciseId: "incline-curl", sets: 4, reps: 10, weightKg: 20 }],
      70,
      TODAY, // 14일 전 → 약 절반
    )["arm-biceps-long"];
    expect(old).toBeLessThan(fresh);
    expect(old).toBeCloseTo(fresh / 2, 1);
  });
});