/**
 * 1년 돌아보기(운동 잔디) — 라이트 2단계 혜택 4(2026-10-02, docs/lite-stage2-design-2026-10-02.html). 순수 모듈.
 *
 * 최근 52주(월요일 시작)를 7×53 칸으로, 운동한 날은 볼륨이 클수록 진하게(0~4).
 * 숫자: 운동한 날 · 총 볼륨 · 가장 많이 한 운동 · 가장 크게 오른 신기록 · 가장 길게 이어 간 주.
 */
import type { PrEvent } from "@/features/routine/fit-growth";

export const YEAR_WEEKS = 53;

const DAY = 86_400_000;
const toT = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`);
const toYmd = (t: number) => new Date(t).toISOString().slice(0, 10);

/** 그 날이 들어 있는 주의 월요일. */
export function mondayOf(ymd: string): string {
  const t = toT(ymd);
  const dow = new Date(t).getUTCDay(); // 0=일
  return toYmd(t - ((dow + 6) % 7) * DAY);
}

/** 칸 진하기 — 운동 안 한 날 0, 한 날은 그 사람의 볼륨 분포(사분위)로 1~4. 볼륨 0(맨몸·유산소)이어도 운동했으면 1. */
export function levelFor(volume: number, sortedPositive: readonly number[]): 0 | 1 | 2 | 3 | 4 {
  if (volume < 0) return 0;
  if (sortedPositive.length === 0 || volume === 0) return 1;
  const q = (p: number) => sortedPositive[Math.min(sortedPositive.length - 1, Math.floor(p * sortedPositive.length))];
  if (volume >= q(0.75)) return 4;
  if (volume >= q(0.5)) return 3;
  if (volume >= q(0.25)) return 2;
  return 1;
}

export type YearCell = { date: string; level: 0 | 1 | 2 | 3 | 4; future: boolean };

export type YearReview = {
  from: string;
  to: string;
  /** 열 = 주(오래된 → 최근), 행 = 월~일. */
  weeks: YearCell[][];
  days: number;
  volumeKg: number;
  topExercise: { exerciseId: string; days: number } | null;
  bestPr: PrEvent | null;
  /** 한 주도 안 빠지고 운동한 가장 긴 연속 주. */
  longestWeekStreak: number;
};

/**
 * @param dayVolume 운동한 날 → 그날 볼륨(kg). 키가 있으면 운동한 날(볼륨 0이어도).
 * @param exerciseDays 종목 → 그 종목을 한 날 수.
 */
export function yearReview(
  dayVolume: ReadonlyMap<string, number>,
  exerciseDays: ReadonlyMap<string, number>,
  prs: readonly PrEvent[],
  today: string,
): YearReview {
  const start = toT(mondayOf(today)) - (YEAR_WEEKS - 1) * 7 * DAY;
  const from = toYmd(start);
  const inRange = [...dayVolume.entries()].filter(([d]) => d >= from && d <= today);
  const positive = inRange.map(([, v]) => v).filter((v) => v > 0).sort((a, b) => a - b);

  const weeks: YearCell[][] = [];
  const activeWeeks: boolean[] = [];
  for (let w = 0; w < YEAR_WEEKS; w++) {
    const col: YearCell[] = [];
    let any = false;
    for (let d = 0; d < 7; d++) {
      const date = toYmd(start + (w * 7 + d) * DAY);
      const future = date > today;
      const v = dayVolume.get(date);
      const level = future || v === undefined ? 0 : levelFor(v, positive);
      if (level > 0) any = true;
      col.push({ date, level, future });
    }
    weeks.push(col);
    activeWeeks.push(any);
  }
  let longest = 0;
  let run = 0;
  for (const a of activeWeeks) {
    run = a ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const top = [...exerciseDays.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const yearPrs = prs.filter((p) => p.date >= from && p.date <= today);
  const bestPr = yearPrs.reduce<PrEvent | null>((best, p) => (!best || p.gainKg > best.gainKg ? p : best), null);
  return {
    from,
    to: today,
    weeks,
    days: inRange.length,
    volumeKg: Math.round(inRange.reduce((s, [, v]) => s + v, 0)),
    topExercise: top ? { exerciseId: top[0], days: top[1] } : null,
    bestPr,
    longestWeekStreak: longest,
  };
}
