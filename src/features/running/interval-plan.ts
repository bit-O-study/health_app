export type RunInterval = { kind: "walk" | "run"; durationSec: number; speedKmh: number; incline: number };
export type IntervalPlan = { intervals: RunInterval[]; repeats: number };
export const INTERVAL_EXAMPLE: IntervalPlan = { repeats: 3, intervals: [
  { kind: "walk", durationSec: 180, speedKmh: 5, incline: 0 },
  { kind: "run", durationSec: 120, speedKmh: 8, incline: 3 },
  { kind: "walk", durationSec: 60, speedKmh: 4, incline: 0 },
] };
export function validIntervalPlan(value: unknown): value is IntervalPlan {
  if (!value || typeof value !== "object") return false;
  const p = value as IntervalPlan;
  return Number.isInteger(p.repeats) && p.repeats >= 1 && p.repeats <= 20
    && Array.isArray(p.intervals) && p.intervals.length >= 1 && p.intervals.length <= 12
    && p.intervals.every(s => s && (s.kind === "walk" || s.kind === "run")
      && Number.isInteger(s.durationSec) && s.durationSec >= 15 && s.durationSec <= 3600
      && Number.isFinite(s.speedKmh) && s.speedKmh >= 1 && s.speedKmh <= 20
      && Number.isFinite(s.incline) && s.incline >= 0 && s.incline <= 15)
    && intervalTotalSec(p) <= 4 * 60 * 60;
}
export function intervalTotalSec(plan: IntervalPlan): number {
  return plan.intervals.reduce((sum, step) => sum + step.durationSec, 0) * plan.repeats;
}
/** Pure timeline: boundaries advance exactly once, including repeated cycles. */
export function intervalProgress(plan: IntervalPlan, elapsedSec: number) {
  const cycleSec = plan.intervals.reduce((sum, step) => sum + step.durationSec, 0);
  const totalSec = cycleSec * plan.repeats;
  const elapsed = Math.min(totalSec, Math.max(0, elapsedSec));
  if (elapsed >= totalSec) return { done: true as const, totalSec, elapsed, index: plan.intervals.length - 1, repeat: plan.repeats, remainingSec: 0, next: null, step: plan.intervals.at(-1)! };
  const cycle = Math.floor(elapsed / cycleSec);
  let offset = elapsed - cycle * cycleSec;
  let index = 0;
  while (offset >= plan.intervals[index].durationSec && index < plan.intervals.length - 1) {
    offset -= plan.intervals[index++].durationSec;
  }
  const next = plan.intervals[index + 1] ?? (cycle + 1 < plan.repeats ? plan.intervals[0] : null);
  return { done: false as const, totalSec, elapsed, index, repeat: cycle + 1, remainingSec: Math.ceil(plan.intervals[index].durationSec - offset), next, step: plan.intervals[index] };
}
/** Integrate only completed active time; a partial interval keeps its own settings. */
export function intervalSummary(plan: IntervalPlan, elapsedSec: number) {
  let left = Math.max(0, Math.min(intervalTotalSec(plan), elapsedSec));
  const durationSec = left;
  let distanceM = 0, inclineSeconds = 0;
  for (let r = 0; r < plan.repeats && left > 0; r++) {
    for (const step of plan.intervals) {
      const seconds = Math.min(left, step.durationSec);
      distanceM += step.speedKmh / 3.6 * seconds;
      inclineSeconds += step.incline * seconds;
      left -= seconds;
      if (left <= 0) break;
    }
  }
  return { durationSec, distanceM, avgKmh: durationSec ? distanceM / durationSec * 3.6 : 0, incline: durationSec ? inclineSeconds / durationSec : 0 };
}
export type IntervalCheckpoint = { id: string; startedAt: string; elapsedMs: number; plan: IntervalPlan };
export function readIntervalCheckpoint(raw: string | null): IntervalCheckpoint | null {
  try {
    const v = JSON.parse(raw ?? "null") as IntervalCheckpoint;
    if (!v || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v.id)
      || !Number.isFinite(Date.parse(v.startedAt)) || !validIntervalPlan(v.plan)
      || !Number.isFinite(v.elapsedMs) || v.elapsedMs < 0 || v.elapsedMs > intervalTotalSec(v.plan) * 1000) return null;
    return v;
  } catch { return null; }
}
