import { describe, expect, it } from "vitest";

import {
  formatRunPace,
  runWeekBounds,
  summarizeRunWeek,
  type RunHistoryRow,
} from "@/features/running/run-history-summary";

const row = (forDate: string, overrides: Partial<RunHistoryRow> = {}): RunHistoryRow => ({
  id: forDate,
  forDate,
  mode: "outdoor",
  startedAt: `${forDate}T00:00:00.000Z`,
  durationSec: 600,
  distanceM: 2_000,
  avgKmh: 12,
  paceSecPerKm: 300,
  caloriesKcal: 100,
  averageHeartRate: null,
  maxHeartRate: null,
  heartRateSampleCount: 0,
  incline: null,
  routePointCount: 2,
  ...overrides,
});

describe("run history summary", () => {
  it("월요일부터 오늘까지만 이번 주로 집계한다", () => {
    expect(runWeekBounds("2026-09-03")).toEqual({
      from: "2026-08-31",
      to: "2026-09-03",
    });
    expect(summarizeRunWeek([
      row("2026-08-30"),
      row("2026-08-31"),
      row("2026-09-03", { durationSec: 300, distanceM: 1_000, caloriesKcal: 50 }),
      row("2026-09-04"),
    ], "2026-09-03")).toMatchObject({
      sessions: 2,
      durationSec: 900,
      distanceM: 3_000,
      caloriesKcal: 150,
    });
  });

  it("일요일도 같은 주의 월요일을 사용하고 페이스를 표시한다", () => {
    expect(runWeekBounds("2026-09-06").from).toBe("2026-08-31");
    expect(formatRunPace(305)).toBe("5'05\"/km");
    expect(formatRunPace(null)).toBe("—");
  });
});
