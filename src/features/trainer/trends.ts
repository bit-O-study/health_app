/**
 * 트레이너 대시보드 · 회원 주별/월별 변화(2026-10-07) — 순수 로직.
 *
 * - 주 = 달력 주(월요일 시작, `routine/week.ts`), 월 = 달력 월.
 * - **이번 기간 vs 지난 기간은 같은 일수끼리** — 오늘이 수요일이면 지난주도 월~수만 센다.
 * - 회원이 공유를 끈 칸은 null(화면은 '비공개'), 줄었는지 판단에도 안 쓴다.
 * 검수보고서: 다짐 · 회원 주별 월별 변화(2026-10-07).
 */

import { weekStartYmd } from "@/features/routine/week";

export type TrendPeriod = "week" | "month";

/** RPC `pt_trainer_trends` 한 줄. */
export type TrainerTrendRow = {
  link: string;
  workout: { d: string; sets: number }[] | null;
  diet: string[] | null;
  body: { d: string; kg: number | string }[] | null;
};

export type Delta = { now: number; prev: number; diff: number };
export type MemberTrend = {
  link: string;
  /** 운동한 날 · 세트 — 공유 안 했으면 null. */
  days: Delta | null;
  sets: Delta | null;
  /** 식단 기록한 날. */
  diet: Delta | null;
  /** 이번 기간 마지막 체중과 지난 기간 마지막 체중. 이번 기간 기록이 없으면 now=null. */
  weight: { now: number | null; diff: number | null } | null;
  /** 최근 8주(6개월) 세트 — 오래된 것부터. 공유 안 했으면 null. */
  spark: number[] | null;
  /** 운동한 날이나 세트가 지난 기간 같은 일수보다 줄었다. */
  dropped: boolean;
};

export const SPARK_WEEKS = 8;
export const SPARK_MONTHS = 6;

function addDays(ymd: string, n: number): string {
  const t = Date.parse(`${ymd}T00:00:00Z`) + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
function shiftMonth(ymd: string, n: number): string {
  const [y, m] = ymd.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

/** 이번 기간 [시작, 오늘] 과 같은 일수의 지난 기간 [시작, 끝]. */
export function periodRanges(period: TrendPeriod, today: string) {
  if (period === "week") {
    const start = weekStartYmd(today);
    const n = Math.round((Date.parse(today) - Date.parse(start)) / 86_400_000);
    const prevStart = addDays(start, -7);
    return { cur: { from: start, to: today }, prev: { from: prevStart, to: addDays(prevStart, n) } };
  }
  const start = `${today.slice(0, 7)}-01`;
  const prevStart = shiftMonth(today, -1);
  const day = Number(today.slice(8, 10));
  // 지난달이 더 짧으면(3/31 → 2월) 지난달 말일까지.
  const prevLast = addDays(start, -1);
  const prevTo = addDays(prevStart, day - 1);
  return { cur: { from: start, to: today }, prev: { from: prevStart, to: prevTo > prevLast ? prevLast : prevTo } };
}

/** 스파크라인 칸들 [시작, 끝] — 오래된 것부터, 마지막이 이번 기간(오늘까지). */
export function sparkRanges(period: TrendPeriod, today: string): { from: string; to: string }[] {
  if (period === "week") {
    const start = weekStartYmd(today);
    return Array.from({ length: SPARK_WEEKS }, (_, i) => {
      const from = addDays(start, -7 * (SPARK_WEEKS - 1 - i));
      return { from, to: i === SPARK_WEEKS - 1 ? today : addDays(from, 6) };
    });
  }
  return Array.from({ length: SPARK_MONTHS }, (_, i) => {
    const from = shiftMonth(today, -(SPARK_MONTHS - 1 - i));
    return { from, to: i === SPARK_MONTHS - 1 ? today : addDays(shiftMonth(from, 1), -1) };
  });
}

const within = (d: string, r: { from: string; to: string }) => d >= r.from && d <= r.to;
const delta = (now: number, prev: number): Delta => ({ now, prev, diff: now - prev });

export function memberTrend(row: TrainerTrendRow, period: TrendPeriod, today: string): MemberTrend {
  const { cur, prev } = periodRanges(period, today);
  const w = row.workout;
  const sum = (r: typeof cur) => (w ?? []).filter((x) => within(x.d, r)).reduce((s, x) => s + x.sets, 0);
  const cnt = (r: typeof cur) => (w ?? []).filter((x) => within(x.d, r) && x.sets > 0).length;
  const days = w ? delta(cnt(cur), cnt(prev)) : null;
  const sets = w ? delta(sum(cur), sum(prev)) : null;
  const diet = row.diet ? delta(row.diet.filter((d) => within(d, cur)).length, row.diet.filter((d) => within(d, prev)).length) : null;

  let weight: MemberTrend["weight"] = null;
  if (row.body) {
    const pts = row.body.map((b) => ({ d: b.d, kg: Number(b.kg) })).filter((b) => b.kg > 0);
    const lastIn = (r: typeof cur) => pts.filter((p) => within(p.d, r)).at(-1)?.kg ?? null;
    // 몸무게는 누적이 아니라 같은 일수 비교가 아니라 '지난 기간 전체'의 마지막 값과 비교한다.
    const prevWhole = { from: prev.from, to: addDays(cur.from, -1) };
    const now = lastIn(cur);
    const before = lastIn(prevWhole);
    weight = { now, diff: now !== null && before !== null ? Math.round((now - before) * 10) / 10 : null };
  }

  return {
    link: row.link,
    days,
    sets,
    diet,
    weight,
    spark: w ? sparkRanges(period, today).map((r) => sum(r)) : null,
    dropped: Boolean((days && days.diff < 0) || (sets && sets.diff < 0)),
  };
}

/** 줄어든 회원 먼저 — 나머지는 원래 순서 그대로. */
export function sortDroppedFirst<T extends { dropped: boolean }>(items: readonly T[]): T[] {
  return [...items.filter((x) => x.dropped), ...items.filter((x) => !x.dropped)];
}
