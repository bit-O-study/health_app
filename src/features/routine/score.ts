/**
 * 운동 점수 계산 — 완료된 운동만 합산하고, 오래된 기록일수록 가중치를 낮춘다.
 *   완료 1건 = 10점 × 0.5^(days_ago / HALF_LIFE)
 * HALF_LIFE 14일: 2주 안 하면 점수가 절반으로 줄어듦.
 */

import { seoulYmd } from "@/features/routine/data";
import type { CompletionRow } from "@/features/routine/completions";

const HALF_LIFE_DAYS = 14;
const BASE_POINTS = 10;

function ymdToEpochDay(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

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

export function computeScore(completions: CompletionRow[]): ScoreSummary {
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

  // 점수: 시간 감쇠 합산
  const score = completions.reduce((sum, c) => {
    const age = Math.max(0, todayEpoch - ymdToEpochDay(c.forDate));
    return sum + BASE_POINTS * Math.pow(0.5, age / HALF_LIFE_DAYS);
  }, 0);

  // 최근 7일 카운트
  const last7DayCount = completions.filter(
    (c) => todayEpoch - ymdToEpochDay(c.forDate) <= 6,
  ).length;

  // 연속 일수 — 가장 최근 날짜부터 거꾸로 매일 있는지
  const dates = new Set(completions.map((c) => ymdToEpochDay(c.forDate)));
  let cursor = todayEpoch;
  let currentStreak = 0;
  // 오늘 안 했어도 어제까지 이어졌으면 카운트되도록: 오늘이 없으면 어제부터 시작
  if (!dates.has(cursor)) cursor -= 1;
  while (dates.has(cursor)) {
    currentStreak += 1;
    cursor -= 1;
  }

  // 최장 연속 일수
  const sortedDays = Array.from(dates).sort((a, b) => a - b);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] === sortedDays[i - 1] + 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }
  if (sortedDays.length === 0) longest = 0;

  // 0..100 정규화 — 30일 매일 완료 = 약 290점이 100% 기준
  const CAP = 290;
  const normalized = Math.min(100, Math.round((score / CAP) * 100));

  const lastCompletedYmd = completions[0]?.forDate ?? null; // already desc

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
