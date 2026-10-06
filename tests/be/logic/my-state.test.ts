import { describe, expect, it } from "vitest";

import {
  computeMyState,
  myStateLines,
  proteinTargetG,
  stalledLifts,
  weeklyVolume,
  type MyStateInput,
} from "@/features/coach/my-state";
import type { ProgressRecord } from "@/features/routine/progress";

const rec = (forDate: string, exerciseId: string, sets: number, reps: number, weightKg: number | null): ProgressRecord => ({
  forDate,
  exerciseId,
  status: "done",
  sets,
  reps,
  weightKg,
});

const BASE: MyStateInput = {
  today: "2026-09-30",
  records: [],
  weights: [],
  bodyComps: [],
  profile: { goal: null, weightKg: null, targetWeightKg: null, targetMuscleKg: null, targetBodyFatPct: null },
  waterMlByDay: [],
  proteinGByDay: [],
  kcalByDay: [],
  stepsByDay: [],
};

describe("부위별 주간 세트", () => {
  it("4주 합계를 주 평균으로 나누고 적정(10~20) 판정을 붙인다", () => {
    const records = [
      rec("2026-09-02", "squat", 4, 8, 60),
      rec("2026-09-09", "squat", 4, 8, 60),
      rec("2026-09-16", "squat", 4, 8, 60),
      rec("2026-09-23", "squat", 4, 8, 60),
      rec("2026-09-23", "leg-press", 24, 10, 100),
    ];
    const v = weeklyVolume(records);
    const lower = v.find((x) => x.part === "lower")!;
    expect(lower.weeklySets).toBe(10); // (16 + 24) / 4
    expect(lower.status).toBe("optimal");
    expect(v.find((x) => x.part === "back")!.status).toBe("none");
  });

  it("건너뛴 기록은 세지 않는다", () => {
    const v = weeklyVolume([{ ...rec("2026-09-23", "squat", 20, 8, 60), status: "skipped" }]);
    expect(v.find((x) => x.part === "lower")!.weeklySets).toBe(0);
  });
});

describe("무게 정체", () => {
  it("최근 3번 예상 1RM 이 오르지 않았으면 정체", () => {
    const s = stalledLifts([
      rec("2026-09-10", "squat", 4, 8, 55),
      rec("2026-09-17", "squat", 4, 8, 60),
      rec("2026-09-20", "squat", 4, 8, 60),
      rec("2026-09-24", "squat", 4, 8, 60),
    ]);
    expect(s.map((x) => x.exerciseId)).toEqual(["squat"]);
  });

  it("올랐으면 정체가 아니고, 두 번뿐이면 판단하지 않는다", () => {
    expect(stalledLifts([
      rec("2026-09-17", "squat", 4, 8, 60),
      rec("2026-09-20", "squat", 4, 8, 60),
      rec("2026-09-24", "squat", 4, 8, 62.5),
    ])).toEqual([]);
    expect(stalledLifts([rec("2026-09-20", "squat", 4, 8, 60), rec("2026-09-24", "squat", 4, 8, 60)])).toEqual([]);
  });

  it("맨몸 운동(무게 없음)은 무게로 판단하지 않는다", () => {
    expect(stalledLifts([
      rec("2026-09-17", "push-up", 3, 15, null),
      rec("2026-09-20", "push-up", 3, 15, null),
      rec("2026-09-24", "push-up", 3, 15, null),
    ])).toEqual([]);
  });
});

describe("몸 상태", () => {
  const comp = (date: string, muscle: number, fat: number, ra: number, la: number) => ({
    date, weightKg: null, skeletalMuscleKg: muscle, bodyFatPct: fat,
    muscleRightArm: ra, muscleLeftArm: la, muscleRightLeg: 9, muscleLeftLeg: 9,
  });

  it("체중 4주 변화 · 근육·체지방 변화 · 좌우 차이 5% 이상", () => {
    const s = computeMyState({
      ...BASE,
      weights: [{ date: "2026-09-28", kg: 70.6 }, { date: "2026-09-01", kg: 70 }],
      bodyComps: [comp("2026-09-25", 32.4, 18, 3.3, 3.0), comp("2026-08-25", 32, 18.5, 3.2, 3.0)],
    });
    expect(s.weight).toEqual({ latestKg: 70.6, change4wKg: 0.6 });
    expect(s.body.muscleChangeKg).toBe(0.4);
    expect(s.body.fatPctChange).toBe(-0.5);
    expect(s.body.imbalances).toEqual([{ where: "팔", strongerSide: "오른쪽", diffKg: 0.3 }]);
  });

  it("좌우 차이가 측정 오차 수준(5% 미만)이면 알리지 않는다", () => {
    const s = computeMyState({ ...BASE, bodyComps: [comp("2026-09-25", 32, 18, 3.05, 3.0)] });
    expect(s.body.imbalances).toEqual([]);
  });

  it("목표까지 남은 양", () => {
    const s = computeMyState({
      ...BASE,
      weights: [{ date: "2026-09-28", kg: 72 }],
      bodyComps: [comp("2026-09-25", 30, 20, 3, 3)],
      profile: { goal: "muscle_gain", weightKg: 72, targetWeightKg: 75, targetMuscleKg: 33, targetBodyFatPct: 15 },
    });
    expect(s.toGoal).toEqual({ weightKg: 3, muscleKg: 3, bodyFatPct: -5 });
  });
});

describe("수분·단백질·식단·걸음", () => {
  it("기록 있는 날만 평균 내고, 목표 대비 %를 준다", () => {
    const s = computeMyState({
      ...BASE,
      weights: [{ date: "2026-09-28", kg: 70 }],
      waterMlByDay: [1500, 2500, 0],
      proteinGByDay: [100, 120],
      profile: { ...BASE.profile, goal: "muscle_gain" },
    });
    expect(s.water).toEqual({ avgMl: 2000, targetMl: 2300, pct: 87 });
    expect(s.protein).toEqual({ avgG: 110, targetG: 112 });
  });

  it("기록이 없으면 null — 지어내지 않는다", () => {
    const s = computeMyState(BASE);
    expect(s.water.avgMl).toBeNull();
    expect(s.protein.avgG).toBeNull();
    expect(s.kcalAvg).toBeNull();
    expect(s.stepsAvg).toBeNull();
    expect(s.weight.latestKg).toBeNull();
  });

  it("단백질 목표: 근육·감량은 체중×1.6, 유지는 ×1.2, 체중 모르면 null", () => {
    expect(proteinTargetG("muscle_gain", 70)).toBe(112);
    expect(proteinTargetG("maintain", 70)).toBe(84);
    expect(proteinTargetG("fat_loss", null)).toBeNull();
  });
});

describe("요약 줄", () => {
  it("숫자를 그대로 쓰고, 모르는 항목은 줄을 뺀다", () => {
    const s = computeMyState({
      ...BASE,
      records: [rec("2026-09-23", "squat", 4, 8, 60)],
      weights: [{ date: "2026-09-28", kg: 70 }],
      profile: { ...BASE.profile, goal: "muscle_gain" },
    });
    const lines = myStateLines(s, (id) => id);
    expect(lines[0]).toBe("목표: 근육 증가");
    expect(lines.join("\n")).toContain("하체 1(부족)");
    expect(lines.join("\n")).toContain("체중 70kg");
    expect(lines.join("\n")).not.toContain("골격근");
    expect(lines.join("\n")).not.toContain("수분");
  });
});
