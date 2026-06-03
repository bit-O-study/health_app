import { describe, expect, it } from "vitest";

import {
  dailyVolumeSeries,
  estimate1RM,
  oneRMSeries,
  setVolume,
  topExercisesByVolume,
  trendPct,
  type ProgressRecord,
} from "@/features/routine/progress";

const rec = (
  forDate: string,
  exerciseId: string,
  sets: number | null,
  reps: number | null,
  weightKg: number | null,
): ProgressRecord => ({ forDate, exerciseId, status: "done", sets, reps, weightKg });

describe("progress — 1RM / 볼륨 집계", () => {
  describe("estimate1RM (Epley)", () => {
    it("weight × (1 + reps/30)", () => {
      expect(estimate1RM(100, 5)).toBeCloseTo(116.7, 1);
      expect(estimate1RM(60, 10)).toBeCloseTo(80, 1);
    });
    it("1회는 그 무게 자체", () => {
      expect(estimate1RM(120, 1)).toBe(120);
    });
    it("맨몸/0중량/0회는 0", () => {
      expect(estimate1RM(null, 10)).toBe(0);
      expect(estimate1RM(0, 10)).toBe(0);
      expect(estimate1RM(100, 0)).toBe(0);
    });
  });

  describe("setVolume", () => {
    it("sets × reps × weight", () => {
      expect(setVolume(4, 10, 60)).toBe(2400);
    });
    it("맨몸(무게 null)은 0", () => {
      expect(setVolume(3, 15, null)).toBe(0);
    });
  });

  describe("dailyVolumeSeries", () => {
    it("날짜별 합산 + 오름차순 + 맨몸(0) 제외", () => {
      const s = dailyVolumeSeries([
        rec("2026-06-02", "bench", 4, 10, 60), // 2400
        rec("2026-06-02", "squat", 5, 5, 100), // 2500
        rec("2026-06-01", "bench", 3, 10, 50), // 1500
        rec("2026-06-03", "plank", 3, 30, null), // 0 → 제외
      ]);
      expect(s).toEqual([
        { date: "2026-06-01", value: 1500 },
        { date: "2026-06-02", value: 4900 },
      ]);
    });
  });

  describe("oneRMSeries", () => {
    it("특정 종목의 날짜별 최고 추정 1RM", () => {
      const s = oneRMSeries(
        [
          rec("2026-06-01", "bench", 1, 5, 80),
          rec("2026-06-01", "bench", 1, 3, 90), // 더 높음
          rec("2026-06-01", "squat", 1, 5, 120), // 다른 종목 제외
          rec("2026-06-03", "bench", 1, 5, 85),
        ],
        "bench",
      );
      expect(s.length).toBe(2);
      expect(s[0].date).toBe("2026-06-01");
      expect(s[1].date).toBe("2026-06-03");
      expect(s[0].value).toBe(estimate1RM(90, 3));
    });
  });

  describe("topExercisesByVolume", () => {
    it("총 볼륨 순위", () => {
      const top = topExercisesByVolume([
        rec("2026-06-01", "squat", 5, 5, 100), // 2500
        rec("2026-06-01", "bench", 4, 10, 60), // 2400
        rec("2026-06-02", "squat", 5, 5, 100), // +2500 → 5000
      ]);
      expect(top[0]).toEqual({ exerciseId: "squat", volume: 5000 });
      expect(top[1]).toEqual({ exerciseId: "bench", volume: 2400 });
    });
  });

  describe("trendPct", () => {
    it("첫 값 대비 마지막 값 변화율", () => {
      expect(trendPct([{ date: "a", value: 100 }, { date: "b", value: 130 }])).toBe(30);
      expect(trendPct([{ date: "a", value: 100 }])).toBeNull();
    });
  });
});
