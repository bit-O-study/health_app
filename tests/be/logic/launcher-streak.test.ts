import { describe, expect, it } from "vitest";

import { computeStreakDays, type StreakDay } from "@/features/launcher/streak";

const d = (minutes: number, level = 0): StreakDay => ({ minutes, level });
/** 집계 범위 밖(달력 여백). */
const pad = (): StreakDay => ({ minutes: 0, level: -1 });

describe("연속 운동일수", () => {
  it("오늘까지 이어지면 그대로 센다", () => {
    expect(computeStreakDays([d(0), d(30), d(45), d(20)])).toBe(3);
  });

  it("오늘이 비어 있어도 어제까지 이어졌으면 끊지 않는다", () => {
    // 저녁형 사용자가 아침에 홈을 열었을 때 연속이 0으로 보이면 안 된다.
    expect(computeStreakDays([d(30), d(45), d(20), d(0)])).toBe(3);
  });

  it("어제까지도 비었으면 0", () => {
    expect(computeStreakDays([d(40), d(0), d(0)])).toBe(0);
  });

  it("중간에 쉰 날이 있으면 거기서 끊는다", () => {
    expect(computeStreakDays([d(60), d(0), d(30), d(30)])).toBe(2);
  });

  it("달력 여백(level -1)은 세지 않는다", () => {
    expect(computeStreakDays([pad(), pad(), d(30), d(30)])).toBe(2);
    expect(computeStreakDays([d(30), d(30), pad()])).toBe(2);
  });

  it("기록이 없으면 0", () => {
    expect(computeStreakDays([])).toBe(0);
    expect(computeStreakDays([pad(), pad()])).toBe(0);
  });

  it("전부 운동했으면 전체 길이", () => {
    expect(computeStreakDays(Array.from({ length: 12 }, () => d(25)))).toBe(12);
  });
});
