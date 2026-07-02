import { describe, expect, it } from "vitest";

import {
  COMMITMENT_METRICS,
  COMMITMENT_PRESETS,
  commitmentProgress,
  isActiveOn,
  isCommitmentMetric,
  ymdDiff,
  type CommitmentAgg,
} from "@/features/commitments/commitment";

const agg = (over: Partial<CommitmentAgg>): CommitmentAgg => ({
  workoutDays: 0,
  workoutCount: 0,
  burnKcal: 0,
  dietDays: 0,
  intakeAvg: 0,
  intakeDays: 0,
  ...over,
});

describe("metadata", () => {
  it("all presets reference a known metric", () => {
    for (const p of COMMITMENT_PRESETS) {
      expect(isCommitmentMetric(p.metric)).toBe(true);
    }
  });
  it("metric ids are unique", () => {
    const ids = COMMITMENT_METRICS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("ymdDiff", () => {
  it("counts days between", () => {
    expect(ymdDiff("2026-07-01", "2026-07-01")).toBe(0);
    expect(ymdDiff("2026-07-01", "2026-07-05")).toBe(4);
    expect(ymdDiff("2026-07-05", "2026-07-01")).toBe(-4);
  });
});

describe("commitmentProgress — atleast metrics", () => {
  const base = { startDate: "2026-06-01", deadline: "2026-07-10" };
  const today = "2026-07-02";

  it("workout_days progress + not done", () => {
    const p = commitmentProgress(
      { ...base, metric: "workout_days", target: 12 },
      agg({ workoutDays: 6 }),
      today,
    );
    expect(p.current).toBe(6);
    expect(p.pct).toBe(50);
    expect(p.done).toBe(false);
    expect(p.expired).toBe(false);
    expect(p.daysLeft).toBe(9); // 7/2..7/10 inclusive
  });

  it("done + pct capped at 100", () => {
    const p = commitmentProgress(
      { ...base, metric: "burn_kcal", target: 5000 },
      agg({ burnKcal: 6200 }),
      today,
    );
    expect(p.done).toBe(true);
    expect(p.pct).toBe(100);
  });
});

describe("commitmentProgress — atmost (intake_avg_max)", () => {
  const c = {
    metric: "intake_avg_max" as const,
    target: 2000,
    startDate: "2026-06-01",
    deadline: "2026-07-10",
  };
  const today = "2026-07-02";

  it("done when average is at or below target (and has data)", () => {
    const p = commitmentProgress(c, agg({ intakeAvg: 1800, intakeDays: 5 }), today);
    expect(p.current).toBe(1800);
    expect(p.done).toBe(true);
  });
  it("not done when over target", () => {
    const p = commitmentProgress(c, agg({ intakeAvg: 2300, intakeDays: 5 }), today);
    expect(p.done).toBe(false);
  });
  it("not done when no intake data yet", () => {
    const p = commitmentProgress(c, agg({ intakeAvg: 0, intakeDays: 0 }), today);
    expect(p.done).toBe(false);
  });
});

describe("deadline states", () => {
  const mk = (deadline: string, start = "2026-06-01") => ({
    metric: "workout_days" as const,
    target: 5,
    startDate: start,
    deadline,
  });
  it("expired when deadline passed", () => {
    const p = commitmentProgress(mk("2026-07-01"), agg({}), "2026-07-02");
    expect(p.expired).toBe(true);
    expect(p.daysLeft).toBe(0);
  });
  it("upcoming when start in future", () => {
    const p = commitmentProgress(mk("2026-08-01", "2026-07-10"), agg({}), "2026-07-02");
    expect(p.upcoming).toBe(true);
  });
});

describe("isActiveOn", () => {
  const c = { startDate: "2026-07-01", deadline: "2026-07-10" };
  it("true within range inclusive", () => {
    expect(isActiveOn(c, "2026-07-01")).toBe(true);
    expect(isActiveOn(c, "2026-07-10")).toBe(true);
    expect(isActiveOn(c, "2026-07-05")).toBe(true);
  });
  it("false outside", () => {
    expect(isActiveOn(c, "2026-06-30")).toBe(false);
    expect(isActiveOn(c, "2026-07-11")).toBe(false);
  });
});
