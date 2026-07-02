import { describe, expect, it } from "vitest";

import {
  challengeProgress,
  isChallengeMetric,
  metricValue,
} from "@/features/groups/challenge";

const M = (kcal: number, workouts: number, days: number) => ({
  kcal,
  workouts,
  days,
});

describe("isChallengeMetric", () => {
  it("accepts known metrics only", () => {
    expect(isChallengeMetric("kcal")).toBe(true);
    expect(isChallengeMetric("workouts")).toBe(true);
    expect(isChallengeMetric("steps")).toBe(false);
  });
});

describe("metricValue", () => {
  it("picks the right field", () => {
    const m = M(500, 4, 3);
    expect(metricValue("kcal", m)).toBe(500);
    expect(metricValue("workouts", m)).toBe(4);
    expect(metricValue("days", m)).toBe(3);
  });
});

describe("challengeProgress", () => {
  const members = [M(1000, 5, 3), M(500, 3, 2)];

  it("sums members and computes pct", () => {
    const p = challengeProgress("kcal", 3000, members);
    expect(p.current).toBe(1500);
    expect(p.pct).toBe(50);
    expect(p.done).toBe(false);
  });

  it("marks done and caps pct at 100", () => {
    const p = challengeProgress("workouts", 6, members); // 5+3=8 >= 6
    expect(p.current).toBe(8);
    expect(p.pct).toBe(100);
    expect(p.done).toBe(true);
  });

  it("target 0 → pct 0, not done", () => {
    const p = challengeProgress("days", 0, members);
    expect(p.pct).toBe(0);
    expect(p.done).toBe(false);
  });
});
