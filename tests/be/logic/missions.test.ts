import { describe, it, expect } from "vitest";
import {
  achievementForDay,
  markerForPct,
  buildMissionsFromSurvey,
  sanitizeMissions,
  MISSION_CATALOG,
  DEFAULT_SURVEY,
  EMPTY_DAY,
  type DayStats,
  type MissionSpec,
} from "@/features/commitments/missions";

const day = (o: Partial<DayStats>): DayStats => ({ ...EMPTY_DAY, ...o });

describe("achievementForDay", () => {
  const missions: MissionSpec[] = [
    { type: "workout_today", target: 0 },
    { type: "burn_kcal", target: 300 },
    { type: "meal_count", target: 3 },
    { type: "intake_max", target: 2000 },
  ];
  it("아무것도 안 하면 0%", () => {
    expect(achievementForDay(missions, EMPTY_DAY)).toEqual({ done: 0, total: 4, pct: 0 });
  });
  it("일부 달성 → 비율", () => {
    const d = day({ workedOut: true, burnKcal: 350, loggedDiet: true, mealCount: 2, intakeKcal: 1800 });
    // workout✓ burn✓ meal_count(2<3)✗ intake_max(1800<=2000)✓ = 3/4
    expect(achievementForDay(missions, d)).toEqual({ done: 3, total: 4, pct: 75 });
  });
  it("intake_max 는 기록 있어야 달성", () => {
    const d = day({ intakeKcal: 0, loggedDiet: false });
    expect(MISSION_CATALOG.intake_max.check(d, 2000)).toBe(false);
    expect(MISSION_CATALOG.intake_max.check(day({ loggedDiet: true, intakeKcal: 1500 }), 2000)).toBe(true);
  });
  it("미션 없으면 0%", () => {
    expect(achievementForDay([], EMPTY_DAY)).toEqual({ done: 0, total: 0, pct: 0 });
  });
});

describe("markerForPct", () => {
  it("70%+ ○, 40%+ △, 그 미만 ✕", () => {
    expect(markerForPct(70, true)).toBe("circle");
    expect(markerForPct(100, true)).toBe("circle");
    expect(markerForPct(40, true)).toBe("triangle");
    expect(markerForPct(69, true)).toBe("triangle");
    expect(markerForPct(39, true)).toBe("cross");
    expect(markerForPct(0, true)).toBe("cross");
  });
  it("미션 없으면 마커 없음", () => {
    expect(markerForPct(0, false)).toBeNull();
  });
});

describe("buildMissionsFromSurvey", () => {
  it("켜진 항목만 미션 생성", () => {
    const missions = buildMissionsFromSurvey({
      ...DEFAULT_SURVEY,
      workoutDaily: true,
      burnKcal: 300,
      logMeals: true,
      mealCount: 3,
      cardioMin: 0,
      intakeMax: 0,
      proteinMin: 0,
      strengthDaily: false,
    });
    const types = missions.map((m) => m.type).sort();
    expect(types).toEqual(["burn_kcal", "meal_count", "meal_log", "workout_today"].sort());
    expect(missions.find((m) => m.type === "burn_kcal")?.target).toBe(300);
  });
  it("0 목표 항목은 생성 안 함", () => {
    const missions = buildMissionsFromSurvey({
      ...DEFAULT_SURVEY,
      workoutDaily: false,
      strengthDaily: false,
      cardioMin: 0,
      burnKcal: 0,
      logMeals: false,
      mealCount: 0,
      intakeMax: 0,
      proteinMin: 0,
    });
    expect(missions).toEqual([]);
  });
});

describe("sanitizeMissions", () => {
  it("알 수 없는 타입·중복 제거, 목표 정규화", () => {
    const out = sanitizeMissions([
      { type: "burn_kcal", target: 250 },
      { type: "burn_kcal", target: 999 }, // 중복 → 제거
      { type: "bogus", target: 1 }, // 무효
      { type: "meal_log" }, // 목표 불필요
      { type: "protein_min", target: -5 }, // 음수 → 기본값
    ]);
    expect(out.map((m) => m.type)).toEqual(["burn_kcal", "meal_log", "protein_min"]);
    expect(out.find((m) => m.type === "burn_kcal")?.target).toBe(250);
    expect(out.find((m) => m.type === "protein_min")?.target).toBe(
      MISSION_CATALOG.protein_min.defaultTarget,
    );
  });
  it("배열 아니면 빈 목록", () => {
    expect(sanitizeMissions(null)).toEqual([]);
    expect(sanitizeMissions("x")).toEqual([]);
  });
});
