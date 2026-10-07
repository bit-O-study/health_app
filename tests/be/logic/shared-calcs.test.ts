import { describe, expect, it } from "vitest";

import { DEFAULT_WEIGHT_KG, burnKcalByDate, cardioDoneKcal, strengthDoneKcal, weightOrDefault } from "@/features/routine/burn";
import { estimateConditioningKcal, strengthKcalForCompletion } from "@/features/routine/calories";
import { conditioningDefaults } from "@/features/routine/conditioning-catalog";
import { countStreak } from "@/features/routine/streak-rule";
import { weekStartYmd } from "@/features/routine/week";
import { weekStartOf } from "@/features/routine/training-volume";
import { mondayOf } from "@/features/lite/year-review";
import { currentStreak } from "@/features/calendar/month-stats";
import { computeWorkoutStreak } from "@/features/groups/streak";
import { computeStreakDays } from "@/features/launcher/streak";
import { STEP_KCAL_PER_KG, stepsToKcal } from "@/features/health/steps-calories";
import { STEP_KCAL_PER_KG as PLEDGE_STEP } from "@/features/commitments/prediction";
import { basalMetabolicRate, mifflinBmr } from "@/features/diet/calorie-target";

// 2026-10-07 정리 — 같은 계산이 여러 곳에 따로 있던 것을 한 곳으로 모았다(검수보고서: 데이터 흐름).

describe("소모 kcal — 모든 화면이 같은 규칙(burn.ts)", () => {
  it("유산소는 경사(incline)까지 넣는다 — 예전엔 일부 화면만 넣어 값이 달랐다", () => {
    const flat = cardioDoneKcal(70, { item_id: "running", duration_min: 20, speed: 5, incline: 0 });
    const hill = cardioDoneKcal(70, { item_id: "running", duration_min: 20, speed: 5, incline: 10 });
    expect(hill).toBeGreaterThan(flat);
    expect(hill).toBeCloseTo(estimateConditioningKcal(70, "running", 20, 5, 10));
  });

  it("스냅샷이 비면 카탈로그 기본값(시간·속도·경사)", () => {
    const d = conditioningDefaults("running");
    expect(cardioDoneKcal(70, { item_id: "running", duration_min: null, speed: null, incline: null })).toBeCloseTo(
      estimateConditioningKcal(70, "running", d.durationMin, d.speed, d.incline),
    );
  });

  it("근력은 완료 스냅샷 세트 수 그대로", () => {
    expect(strengthDoneKcal(70, { exercise_id: "squat", sets: "4" })).toBeCloseTo(strengthKcalForCompletion(70, "squat", 4));
    expect(strengthDoneKcal(70, { exercise_id: null, sets: 4 })).toBe(0);
  });

  it("날짜별 합계", () => {
    const m = burnKcalByDate(
      70,
      [{ for_date: "2026-10-06", exercise_id: "squat", sets: 4 }],
      [{ for_date: "2026-10-06", item_id: "running", duration_min: 20, speed: 5 }, { for_date: "2026-10-05", item_id: null, duration_min: 10, speed: 5 }],
    );
    expect([...m.keys()]).toEqual(["2026-10-06"]);
  });

  it("체중이 없으면 모든 계산이 같은 기본값", () => {
    expect(weightOrDefault(null)).toBe(DEFAULT_WEIGHT_KG);
    expect(weightOrDefault("0")).toBe(DEFAULT_WEIGHT_KG);
    expect(weightOrDefault("72.5")).toBe(72.5);
  });
});

describe("걸음 kcal · 기초대사 — 같은 상수·같은 식", () => {
  it("다짐 예상과 캘린더가 같은 걸음 계수", () => {
    expect(PLEDGE_STEP).toBe(STEP_KCAL_PER_KG);
    expect(stepsToKcal(10000, 70)).toBe(Math.round(10000 * 70 * STEP_KCAL_PER_KG));
  });
  it("식단 권장 kcal 의 BMR = 공통 Mifflin 식", () => {
    expect(basalMetabolicRate({ gender: "male", weightKg: 70, heightCm: 175, age: 30 })).toBe(Math.round(mifflinBmr("male", 70, 175, 30)));
  });
});

describe("연속 운동일 · 주 시작일 — 한 규칙", () => {
  const today = "2026-10-07";
  const days = new Set(["2026-10-06", "2026-10-05", "2026-10-03"]);
  it("오늘이 비면 어제부터, 하루 비면 멈춘다 — 캘린더·그룹·홈이 같은 값", () => {
    expect(countStreak((k) => k === 1 || k === 2)).toBe(2);
    expect(currentStreak(days, today)).toBe(2);
    expect(computeWorkoutStreak(days, today)).toBe(2);
    // 홈 위젯은 잔디 칸(마지막 칸 = 오늘).
    expect(computeStreakDays([{ minutes: 30, level: 1 }, { minutes: 0, level: 0 }, { minutes: 20, level: 1 }, { minutes: 40, level: 1 }, { minutes: 0, level: 0 }])).toBe(2);
  });
  it("주 시작은 월요일 — 세 이름이 같은 함수", () => {
    expect(weekStartYmd("2026-10-07")).toBe("2026-10-05");
    expect(weekStartYmd("2026-10-11")).toBe("2026-10-05");
    expect(weekStartOf("2026-10-11")).toBe("2026-10-05");
    expect(mondayOf("2026-10-05")).toBe("2026-10-05");
  });
});
