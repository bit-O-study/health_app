/**
 * 맞춤 운동 — 성장·월간 리포트(라이트 990원, 2026-10-01). 순수 모듈.
 *
 * 성장: 볼륨 상위 종목의 예상 1RM 추이·정체·신기록. 리포트: 이번 달과 지난달 비교 + 다음 달 한 줄.
 * 숫자는 이미 있는 계산(`progress.ts` · `my-state.ts` · `personal-record.ts`)을 그대로 쓴다.
 */
import {
  oneRMSeries,
  recordOneRM,
  recordVolume,
  topExercisesByVolume,
  trendPct,
  type Point,
  type ProgressRecord,
} from "@/features/routine/progress";
import { stalledLifts } from "@/features/coach/my-state";
import { PR_MIN_GAIN_KG } from "@/features/routine/personal-record";
import { PART_PREFIX, type PartId, type StimulusOf } from "@/features/routine/fit";

export type GrowthRow = {
  exerciseId: string;
  series: Point[];
  latestKg: number;
  /** 첫 기록 대비 %(기록 2개 미만이면 null). */
  trend: number | null;
  stalled: boolean;
};

/** 볼륨 상위 n개 종목의 예상 1RM 추이. */
export function growthRows(records: ProgressRecord[], n = 4): GrowthRow[] {
  const stalled = new Set(stalledLifts(records).map((s) => s.exerciseId));
  return topExercisesByVolume(records, n)
    .map(({ exerciseId }) => {
      const series = oneRMSeries(records, exerciseId);
      return {
        exerciseId,
        series,
        latestKg: series.at(-1)?.value ?? 0,
        trend: trendPct(series),
        stalled: stalled.has(exerciseId),
      };
    })
    .filter((r) => r.series.length > 0);
}

export type PrEvent = { date: string; exerciseId: string; oneRmKg: number; gainKg: number };

/**
 * 신기록 목록 — 날짜순으로 훑어 그 종목의 지난 최고를 0.5kg 이상 넘긴 날(첫 기록은 신기록이 아니다).
 * 최근 것부터 n개.
 */
export function prEvents(records: ProgressRecord[], n = 5): PrEvent[] {
  const byDate = [...records]
    .filter((r) => r.status === "done" && r.exerciseId)
    .sort((a, b) => a.forDate.localeCompare(b.forDate));
  const best = new Map<string, number>();
  const out: PrEvent[] = [];
  for (const r of byDate) {
    const v = recordOneRM(r);
    if (v <= 0) continue;
    const id = r.exerciseId!;
    const prev = best.get(id);
    if (prev !== undefined && v - prev >= PR_MIN_GAIN_KG) {
      out.push({ date: r.forDate, exerciseId: id, oneRmKg: v, gainKg: Math.round((v - prev) * 10) / 10 });
    }
    if (prev === undefined || v > prev) best.set(id, v);
  }
  return out.reverse().slice(0, n);
}

export type MonthStats = { days: number; volumeKg: number; prs: number };

export function monthStats(records: ProgressRecord[], month: string, prs: readonly PrEvent[]): MonthStats {
  const rs = records.filter((r) => r.status === "done" && r.forDate.startsWith(month));
  return {
    days: new Set(rs.map((r) => r.forDate)).size,
    volumeKg: Math.round(rs.reduce((s, r) => s + recordVolume(r), 0)),
    prs: prs.filter((p) => p.date.startsWith(month)).length,
  };
}

/**
 * 이번 달 부위별 자극 vs 목표(주간 목표 × 지난 주 수) — 가장 많이 한 부위와 가장 모자란 부위.
 * 다음 달 한 줄 목표는 가장 모자란 부위로 만든다(규칙, AI 없음).
 */
export function monthParts(
  records: ProgressRecord[],
  month: string,
  weeklyTargets: Readonly<Record<string, number>>,
  weeksElapsed: number,
  stimulusOf: StimulusOf,
): { top: PartId | null; lacking: PartId | null } {
  const stim: Record<PartId, number> = { chest: 0, back: 0, shoulder: 0, arm: 0, lower: 0, core: 0 };
  for (const r of records) {
    if (r.status !== "done" || !r.exerciseId || !r.forDate.startsWith(month)) continue;
    const sets = Array.isArray(r.setDetails) && r.setDetails.length ? r.setDetails.length : Math.max(0, r.sets ?? 0);
    for (const [sub, score] of Object.entries(stimulusOf(r.exerciseId))) {
      const part = PART_PREFIX.find((p) => sub.startsWith(`${p}-`));
      if (part) stim[part] += (sets * score) / 100;
    }
  }
  const ratio = (p: PartId) => {
    const t = Object.entries(weeklyTargets)
      .filter(([k]) => k.startsWith(`${p}-`))
      .reduce((s, [, v]) => s + v, 0) * Math.max(1, weeksElapsed);
    return t > 0 ? stim[p] / t : 0;
  };
  const any = PART_PREFIX.some((p) => stim[p] > 0);
  if (!any) return { top: null, lacking: null };
  const sorted = [...PART_PREFIX].sort((a, b) => ratio(b) - ratio(a));
  return { top: sorted[0], lacking: sorted[sorted.length - 1] };
}

/** 'YYYY-MM' 의 이전 달. */
export function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
}

/** 스파크라인 점 — 0~w, 0~h(위가 큰 값). 점이 하나면 가운데 한 점. */
export function sparkPoints(series: readonly Point[], w = 200, h = 36, pad = 4): string {
  if (series.length === 0) return "";
  const vals = series.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  return series
    .map((p, i) => {
      const x = series.length === 1 ? w / 2 : (i / (series.length - 1)) * w;
      const y = h - pad - ((p.value - min) / span) * (h - pad * 2);
      return `${Math.round(x)},${Math.round(y)}`;
    })
    .join(" ");
}
