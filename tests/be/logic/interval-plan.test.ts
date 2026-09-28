import { describe, expect, it } from "vitest";
import { intervalProgress, intervalSummary, intervalTotalSec, validIntervalPlan, readIntervalCheckpoint, type IntervalPlan } from "@/features/running/interval-plan";
import { normalizeRunSession } from "@/features/running/run-session";
const plan: IntervalPlan = { repeats: 2, intervals: [
 { kind: "walk", durationSec: 30, speedKmh: 3.6, incline: 0 },
 { kind: "run", durationSec: 30, speedKmh: 7.2, incline: 6 },
]};
describe("running interval timeline", () => {
 it("advances at exact boundaries and repeats before completing", () => {
  expect(intervalTotalSec(plan)).toBe(120);
  expect(intervalProgress(plan, 29.9)).toMatchObject({ index: 0, repeat: 1, remainingSec: 1 });
  expect(intervalProgress(plan, 30)).toMatchObject({ index: 1, repeat: 1, remainingSec: 30 });
  expect(intervalProgress(plan, 60)).toMatchObject({ index: 0, repeat: 2 });
  expect(intervalProgress(plan, 120)).toMatchObject({ done: true, remainingSec: 0, next: null });
  expect(intervalProgress(plan, 300)).toMatchObject({ done: true, elapsed: 120 });
 });
 it("weights partial intervals by actual active seconds", () => {
  expect(intervalSummary(plan, 45)).toEqual({ durationSec: 45, distanceM: 60, avgKmh: 4.8, incline: 2 });
  expect(intervalSummary(plan, 120)).toMatchObject({ distanceM: 180, incline: 3 });
 });
 it("rejects empty, non-finite and out-of-range programs", () => {
  expect(validIntervalPlan(plan)).toBe(true);
  for(const p of [{ ...plan, repeats: 0 },{ ...plan, intervals: [] },{ ...plan, repeats: NaN },
    {...plan, intervals: [{...plan.intervals[0], speedKmh: Infinity}]},
    {...plan, intervals: [{...plan.intervals[0], incline: 16}]},
    {...plan, intervals: [{...plan.intervals[0], durationSec: 1}]}]) expect(validIntervalPlan(p)).toBe(false);
 });
 it("restores only structurally valid checkpoints", () => {
  const cp = { id: "12345678-1234-4123-8123-123456789abc", startedAt: "2026-09-28T00:00:00Z", elapsedMs: 30000, plan };
  expect(readIntervalCheckpoint(JSON.stringify(cp))).toEqual(cp);
  expect(readIntervalCheckpoint(JSON.stringify({...cp, elapsedMs: 121000}))).toBeNull();
  expect(readIntervalCheckpoint("broken")).toBeNull();
 });
 it("excludes pauses from duration and rejects more active time than elapsed time", () => {
  const input = { mode: "indoor" as const, startedAt: "2026-09-28T00:00:00Z", endedAt: "2026-09-28T00:03:00Z", distanceM: 180, activeDurationSec: 120 };
  const result = normalizeRunSession(input);
  expect(result.ok && result.session.durationSec).toBe(120);
  expect(normalizeRunSession({...input, activeDurationSec: 181})).toEqual({ ok: false, reason: "invalid_time" });
  expect(normalizeRunSession({...input, activeDurationSec: NaN})).toEqual({ ok: false, reason: "invalid_time" });
 });
});
