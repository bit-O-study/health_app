import { describe, expect, it } from "vitest";

import {
  buildContributionGrid,
  computeDietExerciseNeed,
  computeMacroRemaining,
  levelForMinutes,
} from "@/features/home/dashboard-metrics";

describe("computeDietExerciseNeed (오늘 식단 기준 필요 운동량)", () => {
  it("목표 이내로 먹었으면 필요 운동량 0, pct 100", () => {
    const r = computeDietExerciseNeed({
      targetKcal: 2000,
      eatenKcal: 1500,
      burnedKcal: 0,
      weightKg: 70,
    });
    expect(r.neededKcal).toBe(0);
    expect(r.remainingKcal).toBe(0);
    expect(r.pct).toBe(100);
    expect(r.remainingMinutes).toBe(0);
  });

  it("목표를 넘긴 만큼 필요 운동량이 생기고, 태운 만큼 줄어든다", () => {
    const r = computeDietExerciseNeed({
      targetKcal: 2000,
      eatenKcal: 2500,
      burnedKcal: 200,
      weightKg: 70,
    });
    expect(r.neededKcal).toBe(500);
    expect(r.remainingKcal).toBe(300);
    expect(r.pct).toBe(40);
    expect(r.remainingMinutes).toBeGreaterThan(0);
  });

  it("이미 초과분보다 많이 태웠으면 remainingKcal 0, pct 100 상한", () => {
    const r = computeDietExerciseNeed({
      targetKcal: 2000,
      eatenKcal: 2200,
      burnedKcal: 500,
      weightKg: 70,
    });
    expect(r.remainingKcal).toBe(0);
    expect(r.pct).toBe(100);
  });
});

describe("computeMacroRemaining (탄단지 더 먹어야 하는 양)", () => {
  it("목표보다 덜 먹었으면 남은 양을 그대로 반환", () => {
    const r = computeMacroRemaining(
      { protein: 120, carbs: 250, fat: 60 },
      { protein: 50, carbs: 100, fat: 20 },
    );
    expect(r).toEqual({ protein: 70, carbs: 150, fat: 40 });
  });

  it("이미 목표를 넘긴 항목은 0(음수 없음)", () => {
    const r = computeMacroRemaining(
      { protein: 120, carbs: 250, fat: 60 },
      { protein: 150, carbs: 100, fat: 20 },
    );
    expect(r.protein).toBe(0);
    expect(r.carbs).toBe(150);
  });
});

describe("levelForMinutes (잔디 진하기)", () => {
  it("0분은 level 0", () => {
    expect(levelForMinutes(0)).toBe(0);
  });
  it("분이 늘수록 진해진다", () => {
    expect(levelForMinutes(10)).toBe(1);
    expect(levelForMinutes(30)).toBe(2);
    expect(levelForMinutes(50)).toBe(3);
    expect(levelForMinutes(90)).toBe(4);
  });
});

describe("buildContributionGrid (잔디 그리드)", () => {
  it("weeks*7 칸을 만들고 일요일부터 시작한다", () => {
    const grid = buildContributionGrid(new Map(), "2026-07-20", 53);
    expect(grid.length).toBe(53 * 7);
    const [y, m, d] = grid[0].date.split("-").map(Number);
    const firstDow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    expect(firstDow).toBe(0);
  });

  it("오늘 이후 날짜는 level -1(빈칸)", () => {
    const grid = buildContributionGrid(new Map(), "2026-07-20", 53);
    const today = grid.find((d) => d.date === "2026-07-20")!;
    expect(today.level).not.toBe(-1);
    const tomorrow = grid.find((d) => d.date === "2026-07-21");
    expect(tomorrow?.level).toBe(-1);
  });

  it("운동 기록이 있는 날짜는 시간에 비례해 진해진다", () => {
    const map = new Map([
      ["2026-07-19", 30 * 60], // 30분
      ["2026-07-18", 0],
    ]);
    const grid = buildContributionGrid(map, "2026-07-20", 53);
    const day19 = grid.find((d) => d.date === "2026-07-19")!;
    const day18 = grid.find((d) => d.date === "2026-07-18")!;
    expect(day19.level).toBe(2);
    expect(day18.level).toBe(0);
  });
});