import { describe, expect, it } from "vitest";

import { heroStats } from "@/features/home/hero-stats";
import type { ContributionDay } from "@/features/home/dashboard-metrics";

const day = (i: number, level: ContributionDay["level"]): ContributionDay => ({
  date: `2026-11-${String(i + 1).padStart(2, "0")}`,
  level,
  minutes: level > 0 ? 30 : 0,
});

/** 두 주(14칸) — 둘째 주 수요일(인덱스 10)이 오늘, 그 뒤는 미래(-1). */
function grid(levels: number[]): ContributionDay[] {
  return Array.from({ length: 14 }, (_, i) => day(i, (levels[i] ?? -1) as ContributionDay["level"]));
}

describe("heroStats", () => {
  it("오늘 운동했으면 오늘부터 연속일을 센다", () => {
    const s = heroStats(grid([0, 0, 0, 0, 0, 0, 0, 2, 1, 3, 2]));
    expect(s.todayDone).toBe(true);
    expect(s.streak).toBe(4);
    expect(s.weekCount).toBe(4);
  });

  it("오늘이 비었으면 어제부터 이어진 날을 센다", () => {
    const s = heroStats(grid([0, 0, 0, 0, 0, 0, 0, 2, 1, 3, 0]));
    expect(s.todayDone).toBe(false);
    expect(s.streak).toBe(3);
  });

  it("이번 주 7칸에 요일·오늘·미래를 표시한다", () => {
    const s = heroStats(grid([0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1]));
    expect(s.week.map((d) => d.label).join("")).toBe("일월화수목금토");
    expect(s.week.filter((d) => d.isToday)).toHaveLength(1);
    expect(s.week[3].isToday).toBe(true);
    expect(s.week[4].isFuture).toBe(true);
    expect(s.weekCount).toBe(2);
  });

  it("빈 격자도 깨지지 않는다", () => {
    expect(heroStats([])).toEqual({ todayDone: false, streak: 0, weekCount: 0, week: [] });
  });
});
