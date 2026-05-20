/**
 * 운동 점수 — 완료된 "운동 종목"별로 합산하고 오래된 기록일수록 가중치를 낮춘다.
 *   완료 1건 = 2점 × 0.5^(days_ago / HALF_LIFE)
 * HALF_LIFE 14일: 2주 안 하면 점수가 절반으로 줄어듦.
 * "오늘은 안 함(skipped)" 으로 처리된 건은 점수 합산에서 제외.
 */

import { seoulYmd } from "@/features/routine/data";

const HALF_LIFE_DAYS = 14;
const BASE_POINTS = 2;

function ymdToEpochDay(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export type DoneRecord = { forDate: string };

export type ScoreSummary = {
  score: number;
  totalCount: number;
  currentStreak: number;
  longestStreak: number;
  last7DayCount: number;
  lastCompletedYmd: string | null;
  /** UI 게이지(0..100) 용 정규화 점수 */
  normalized: number;
};

export function computeScore(completions: DoneRecord[]): ScoreSummary {
  if (completions.length === 0) {
    return {
      score: 0,
      totalCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      last7DayCount: 0,
      lastCompletedYmd: null,
      normalized: 0,
    };
  }

  const todayEpoch = ymdToEpochDay(seoulYmd());

  // 점수: 각 완료 건마다 시간 감쇠 적용해 합산
  const score = completions.reduce((sum, c) => {
    const age = Math.max(0, todayEpoch - ymdToEpochDay(c.forDate));
    return sum + BASE_POINTS * Math.pow(0.5, age / HALF_LIFE_DAYS);
  }, 0);

  // 연속/최장 일수는 "그 날 한 개라도 완료" 기준 (distinct days)
  const dateEpochs = new Set(completions.map((c) => ymdToEpochDay(c.forDate)));

  const last7DayCount = Array.from(dateEpochs).filter(
    (e) => todayEpoch - e <= 6,
  ).length;

  let cursor = todayEpoch;
  let currentStreak = 0;
  if (!dateEpochs.has(cursor)) cursor -= 1;
  while (dateEpochs.has(cursor)) {
    currentStreak += 1;
    cursor -= 1;
  }

  const sortedDays = Array.from(dateEpochs).sort((a, b) => a - b);
  let longest = sortedDays.length > 0 ? 1 : 0;
  let run = sortedDays.length > 0 ? 1 : 0;
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] === sortedDays[i - 1] + 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // 30일간 매일 5개 완료(= 150건 ≈ 300점)을 100%로 본다
  const CAP = 300;
  const normalized = Math.min(100, Math.round((score / CAP) * 100));

  // 가장 최근 완료 날짜 (입력은 desc로 옴)
  const sortedDesc = completions
    .map((c) => c.forDate)
    .sort((a, b) => (a < b ? 1 : -1));
  const lastCompletedYmd = sortedDesc[0] ?? null;

  return {
    score: Math.round(score),
    totalCount: completions.length,
    currentStreak,
    longestStreak: longest,
    last7DayCount,
    lastCompletedYmd,
    normalized,
  };
}
