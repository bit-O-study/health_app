import { describe, expect, it } from "vitest";

import {
  buildContributionGrid,
  computeDietExerciseNeed,
  computeMacroRemaining,
  levelForMinutes,
  weeksSinceJoin,
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

  // 가입일 이전은 "운동 안 함(level 0)"이 아니라 "아직 회원이 아니었음" —
  // 미래 날짜와 같은 빈 칸(level -1)으로 구분한다.
  it("★ joinYmd 이전 날짜는 빈 칸(level -1)", () => {
    const map = new Map([["2026-07-01", 30 * 60]]); // 가입 전 기록은 있을 수 없지만 방어적으로
    const grid = buildContributionGrid(map, "2026-07-20", 53, "2026-07-10");
    const beforeJoin = grid.find((d) => d.date === "2026-07-01")!;
    expect(beforeJoin.level).toBe(-1);
    const joinDay = grid.find((d) => d.date === "2026-07-10")!;
    expect(joinDay.level).not.toBe(-1);
  });
});

// 홈은 조회 왕복을 줄이려고 잔디 데이터를 **가입일과 무관하게 53주 통째로** 받아
// 오고, 표시할 주 수만 가입일로 줄인다(getHomeDashboard). 넓게 받아온 데이터가
// 좁은 그리드로 새지 않아야 예전(가입일 맞춤 조회)과 결과가 같다.
describe("★ 넓은 조회창 → 좁은 그리드(홈 왕복 축소) 등가성", () => {
  const wideMap = new Map([
    ["2025-09-01", 40 * 60], // 53주 창엔 있지만 가입 전 + 표시 창 밖
    ["2026-07-01", 30 * 60], // 표시 창 밖(가입 전)
    ["2026-07-15", 25 * 60], // 표시 창 안
  ]);

  it("표시 창(가입 후 2주) 밖의 날짜는 그리드에 아예 없다", () => {
    const weeks = weeksSinceJoin("2026-07-10", "2026-07-20", 53); // 2주
    const grid = buildContributionGrid(wideMap, "2026-07-20", weeks, "2026-07-10");
    expect(grid).toHaveLength(weeks * 7);
    expect(grid.some((d) => d.date === "2025-09-01")).toBe(false);
    expect(grid.some((d) => d.date === "2026-07-01")).toBe(false);
  });

  it("좁게 받아온 맵과 넓게 받아온 맵의 그리드 결과가 같다", () => {
    const weeks = weeksSinceJoin("2026-07-10", "2026-07-20", 53);
    const narrowMap = new Map([["2026-07-15", 25 * 60]]); // 예전 방식(가입일 맞춤 조회)
    expect(
      buildContributionGrid(wideMap, "2026-07-20", weeks, "2026-07-10"),
    ).toEqual(buildContributionGrid(narrowMap, "2026-07-20", weeks, "2026-07-10"));
  });

  it("표시 창 안의 기록은 그대로 반영된다", () => {
    const weeks = weeksSinceJoin("2026-07-10", "2026-07-20", 53);
    const grid = buildContributionGrid(wideMap, "2026-07-20", weeks, "2026-07-10");
    expect(grid.find((d) => d.date === "2026-07-15")!.minutes).toBe(25);
  });
});

describe("weeksSinceJoin (가입일 기준 잔디 그래프 주 수)", () => {
  it("가입 당일이면 최소 1주", () => {
    expect(weeksSinceJoin("2026-07-20", "2026-07-20", 53)).toBe(1);
  });

  it("가입 후 10일이면 2주(올림)", () => {
    expect(weeksSinceJoin("2026-07-10", "2026-07-20", 53)).toBe(2);
  });

  it("★ maxWeeks 를 넘지 않는다(1년 넘게 가입했으면 53주로 상한)", () => {
    expect(weeksSinceJoin("2020-01-01", "2026-07-20", 53)).toBe(53);
  });
});