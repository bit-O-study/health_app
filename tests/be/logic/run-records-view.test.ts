import { describe, expect, it } from "vitest";

import {
  formatRunClock,
  formatRunDate,
  formatRunDuration,
  formatRunKcal,
  formatRunPaceShort,
  groupRunsByWeek,
  monthRange,
  resolveRunMonth,
  runMonthDelta,
  runMonthWeeks,
  shiftMonth,
  summarizeRuns,
} from "@/features/running/run-records-view";

const run = (forDate: string, km: number, min = 30) => ({ forDate, distanceM: km * 1000, durationSec: min * 60 });

describe("표기", () => {
  it("날짜는 '9월 27일 (일)' — ISO 를 화면에 쓰지 않는다", () => {
    expect(formatRunDate("2026-09-27")).toBe("9월 27일 (일)");
    expect(formatRunDate("2026-09-01")).toBe("9월 1일 (화)");
  });
  it("시간은 분/시간 단위, 상세는 시계 형식", () => {
    expect(formatRunDuration(45)).toBe("45초");
    expect(formatRunDuration(1800)).toBe("30분");
    expect(formatRunDuration(15480)).toBe("4시간 18분");
    expect(formatRunDuration(7200)).toBe("2시간");
    expect(formatRunClock(1802)).toBe("30:02");
    expect(formatRunClock(3723)).toBe("1:02:03");
  });
  it("값이 없으면 0 이 아니라 '—'", () => {
    expect(formatRunKcal(0)).toBe("—");
    expect(formatRunKcal(null)).toBe("—");
    expect(formatRunKcal(312)).toBe("312kcal");
    expect(formatRunPaceShort(null)).toBe("—");
    expect(formatRunPaceShort(364)).toBe("6'04\"");
    expect(formatRunPaceShort(359.6)).toBe("6'00\"");
  });
});

describe("월 이동", () => {
  it("미래 달·잘못된 값은 이번 달로", () => {
    expect(resolveRunMonth(undefined, "2026-09-27")).toBe("2026-09");
    expect(resolveRunMonth("2026-10", "2026-09-27")).toBe("2026-09");
    expect(resolveRunMonth("2026-13", "2026-09-27")).toBe("2026-09");
    expect(resolveRunMonth("2026-08", "2026-09-27")).toBe("2026-08");
  });
  it("달 이동과 범위(윤년 포함)", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthRange("2026-09")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });
});

describe("요약", () => {
  it("합계와 평균 페이스", () => {
    expect(summarizeRuns([run("2026-09-01", 5, 30), run("2026-09-02", 5, 31)])).toEqual({
      sessions: 2, distanceM: 10000, durationSec: 3660, paceSecPerKm: 366,
    });
    expect(summarizeRuns([]).paceSecPerKm).toBeNull();
  });
  it("지난달 대비 문구", () => {
    expect(runMonthDelta(42600, 34500)).toEqual({ text: "지난달보다 8.10km 더", trend: "up" });
    expect(runMonthDelta(30000, 34500)).toEqual({ text: "지난달보다 4.50km 덜", trend: "down" });
    expect(runMonthDelta(5000, 0)).toEqual({ text: "지난달 기록 없음", trend: "flat" });
    expect(runMonthDelta(0, 0)).toBeNull();
    expect(runMonthDelta(10020, 10000)).toEqual({ text: "지난달과 비슷해요", trend: "flat" });
  });
});

describe("주별 막대", () => {
  it("2026년 9월은 월요일 시작 5주 — 달 밖의 날은 세지 않고, 이번 주·미래 주 표시", () => {
    const rows = [run("2026-08-31", 9), run("2026-09-02", 3), run("2026-09-05", 3.2), run("2026-09-23", 3.2), run("2026-09-27", 5)];
    const weeks = runMonthWeeks("2026-09", rows, "2026-09-27");
    expect(weeks.map((w) => [w.from, w.to])).toEqual([
      ["2026-09-01", "2026-09-06"],
      ["2026-09-07", "2026-09-13"],
      ["2026-09-14", "2026-09-20"],
      ["2026-09-21", "2026-09-27"],
      ["2026-09-28", "2026-09-30"],
    ]);
    expect(weeks[0].distanceM).toBeCloseTo(6200);
    expect(weeks[3]).toMatchObject({ label: "이번 주", current: true, distanceM: 8200 });
    expect(weeks[4]).toMatchObject({ label: "5주", future: true, distanceM: 0 });
  });
  it("지난달을 보면 '이번 주' 가 없다", () => {
    expect(runMonthWeeks("2026-08", [], "2026-09-27").some((w) => w.current)).toBe(false);
  });
});

describe("주 단위 목록", () => {
  it("최신순 입력을 주별로 묶고 이번 주에 표시", () => {
    const groups = groupRunsByWeek([run("2026-09-27", 5), run("2026-09-25", 4.2), run("2026-09-19", 7.4)], "2026-09-27");
    expect(groups.map((g) => [g.label, g.rows.length, Math.round(g.distanceM)])).toEqual([
      ["이번 주 · 9/21–9/27", 2, 9200],
      ["9/14–9/20", 1, 7400],
    ]);
  });
});
