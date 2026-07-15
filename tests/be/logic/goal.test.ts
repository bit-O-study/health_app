import { describe, expect, it } from "vitest";

import {
  GOALS,
  GOAL_LABEL,
  goalProgress,
  goalTargetKind,
  isGoal,
} from "@/features/profile/goal";

describe("goal registry", () => {
  it("has 4 goals, unique", () => {
    expect([...GOALS].sort()).toEqual([
      "fat_loss",
      "maintain",
      "muscle_gain",
      "weight_loss",
    ]);
  });
  it("every goal has a label", () => {
    for (const g of GOALS) expect(GOAL_LABEL[g].trim().length).toBeGreaterThan(0);
  });
});

describe("isGoal", () => {
  it("passes only valid goals", () => {
    expect(isGoal("weight_loss")).toBe(true);
    expect(isGoal("maintain")).toBe(true);
    expect(isGoal("bulk")).toBe(false);
    expect(isGoal(null)).toBe(false);
  });
});

describe("goalTargetKind", () => {
  it("maps goal → target field", () => {
    expect(goalTargetKind("weight_loss")).toBe("weight");
    expect(goalTargetKind("fat_loss")).toBe("bodyFat");
    expect(goalTargetKind("muscle_gain")).toBe("muscle");
    expect(goalTargetKind("maintain")).toBeNull();
  });
});

const cur = (w: number | null, f: number | null, m: number | null) => ({
  weightKg: w,
  bodyFatPct: f,
  muscleMassKg: m,
});
const tgt = (w: number | null, f: number | null, m: number | null) => ({
  targetWeightKg: w,
  targetBodyFatPct: f,
  targetMuscleKg: m,
});

describe("goalProgress", () => {
  it("유지/목표없음 = null", () => {
    expect(goalProgress("maintain", cur(70, 20, 30), tgt(60, 15, 35))).toBeNull();
    expect(goalProgress(null, cur(70, 20, 30), tgt(60, 15, 35))).toBeNull();
  });

  it("체중감량 — 남은 kg + 지표 라벨", () => {
    const p = goalProgress("weight_loss", cur(73.2, null, null), tgt(70, null, null));
    expect(p).not.toBeNull();
    expect(p!.remaining).toBe(3.2);
    expect(p!.unit).toBe("kg");
    expect(p!.reached).toBe(false);
    expect(p!.metricLabel).toBe("체중");
    expect(p!.remainingText).toBe("3.2kg");
    expect(p!.label).toBe("체중 3.2kg 남음");
  });

  it("체중감량 — 목표 도달(이하)이면 remaining 0·달성", () => {
    const p = goalProgress("weight_loss", cur(69, null, null), tgt(70, null, null));
    expect(p!.remaining).toBe(0);
    expect(p!.reached).toBe(true);
    expect(p!.label).toBe("체중 목표 달성 🎉");
  });

  it("체지방감소 — 남은 % + 지표 라벨", () => {
    const p = goalProgress("fat_loss", cur(null, 24, null), tgt(null, 18, null));
    expect(p!.remaining).toBe(6);
    expect(p!.unit).toBe("%");
    expect(p!.metricLabel).toBe("체지방");
    expect(p!.label).toBe("체지방 6% 남음");
  });

  it("근육증가 — 목표근육 − 현재근육 + 지표 라벨", () => {
    const p = goalProgress("muscle_gain", cur(null, null, 30), tgt(null, null, 34.5));
    expect(p!.remaining).toBe(4.5);
    expect(p!.unit).toBe("kg");
    expect(p!.metricLabel).toBe("근육");
    expect(p!.label).toBe("근육 4.5kg 남음");
  });

  it("현재값/목표치 없으면 null", () => {
    expect(goalProgress("weight_loss", cur(null, null, null), tgt(70, null, null))).toBeNull();
    expect(goalProgress("muscle_gain", cur(null, null, 30), tgt(null, null, null))).toBeNull();
  });
});