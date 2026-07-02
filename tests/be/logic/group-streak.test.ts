import { describe, expect, it } from "vitest";

import {
  computeWorkoutStreak,
  streakBadges,
  topBadge,
} from "@/features/groups/streak";

describe("computeWorkoutStreak", () => {
  const today = "2026-07-02";

  it("0 when no workout dates", () => {
    expect(computeWorkoutStreak([], today)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(
      computeWorkoutStreak(["2026-06-30", "2026-07-01", "2026-07-02"], today),
    ).toBe(3);
  });

  it("keeps streak when today not done yet but yesterday was", () => {
    // 오늘 아직 운동 안 함 → 어제까지 이어진 스트릭 유지.
    expect(computeWorkoutStreak(["2026-06-30", "2026-07-01"], today)).toBe(2);
  });

  it("breaks when neither today nor yesterday", () => {
    expect(computeWorkoutStreak(["2026-06-28", "2026-06-29"], today)).toBe(0);
  });

  it("stops at the first gap", () => {
    // 7/2,7/1 연속, 6/30 빠짐 → 2.
    expect(
      computeWorkoutStreak(["2026-07-02", "2026-07-01", "2026-06-29"], today),
    ).toBe(2);
  });

  it("dedupes duplicate dates", () => {
    expect(
      computeWorkoutStreak(["2026-07-02", "2026-07-02", "2026-07-01"], today),
    ).toBe(2);
  });
});

describe("streakBadges / topBadge", () => {
  it("no badge under 3 days", () => {
    expect(streakBadges(2)).toEqual([]);
    expect(topBadge(2)).toBeNull();
  });
  it("earns thresholds cumulatively, highest first", () => {
    expect(streakBadges(7).map((b) => b.id)).toEqual(["streak7", "streak3"]);
    expect(topBadge(30)?.id).toBe("streak30");
  });
  it("14-day tier included at 14+", () => {
    expect(streakBadges(14).map((b) => b.id)).toEqual([
      "streak14",
      "streak7",
      "streak3",
    ]);
  });
});
