import { describe, expect, it } from "vitest";

import {
  estimateConditioningKcal,
  estimateStrengthKcal,
  estimateTodayKcal,
} from "@/features/routine/calories";

describe("calories (칼로리 추정)", () => {
  it("본운동: 세트가 많을수록 비례해서 증가", () => {
    const a = estimateStrengthKcal(70, "bench-press", 3);
    const b = estimateStrengthKcal(70, "bench-press", 6);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeCloseTo(a * 2, 5);
  });

  it("본운동: 체중이 클수록 증가", () => {
    expect(estimateStrengthKcal(90, "bench-press", 3)).toBeGreaterThan(
      estimateStrengthKcal(50, "bench-press", 3),
    );
  });

  it("컨디셔닝: 달리기 속도가 빠를수록 증가", () => {
    const slow = estimateConditioningKcal(70, "running", 30, 6);
    const fast = estimateConditioningKcal(70, "running", 30, 12);
    expect(fast).toBeGreaterThan(slow);
  });

  it("컨디셔닝: 시간 미지정은 3분 가정으로 양수", () => {
    expect(estimateConditioningKcal(70, "running", null, null)).toBeGreaterThan(0);
  });

  it("estimateTodayKcal: 워밍업+본운동+마무리 합이 total 과 일치", () => {
    const r = estimateTodayKcal({
      weightKg: 75,
      plan: [
        { exerciseId: "bench-press", sets: 4 },
        { exerciseId: "squat", sets: 5 },
      ],
      warmup: [{ itemId: "jumping-jack", durationMin: 2, speed: null }],
      cooldown: [{ itemId: "child-pose", durationMin: 1, speed: null }],
    });
    expect(r.total).toBe(r.warmup + r.main + r.cooldown);
    expect(r.total).toBeGreaterThan(0);
  });

  it("체중 미입력(null)이면 65kg 가정으로 계산", () => {
    const r = estimateTodayKcal({
      weightKg: null,
      plan: [{ exerciseId: "squat", sets: 3 }],
      warmup: [],
      cooldown: [],
    });
    expect(r.main).toBeGreaterThan(0);
  });
});
