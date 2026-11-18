import type { ContributionDay } from "@/features/home/dashboard-metrics";

/** 홈 주인공 카드용 숫자 — 잔디 격자(일요일 시작 주 단위, 미래 칸은 level -1)에서 뽑는다. */
export type WeekDay = { date: string; label: string; done: boolean; isToday: boolean; isFuture: boolean };
export type HeroStats = {
  /** 오늘 운동 기록이 있는지. */
  todayDone: boolean;
  /** 오늘을 포함해 이어진 운동한 날 수(오늘이 비었으면 어제부터 센다). */
  streak: number;
  /** 이번 주(일~토) 운동한 날 수. */
  weekCount: number;
  /** 이번 주 7칸. */
  week: WeekDay[];
};

const LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function heroStats(days: ContributionDay[]): HeroStats {
  let todayIdx = -1;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].level >= 0) {
      todayIdx = i;
      break;
    }
  }
  if (todayIdx < 0) return { todayDone: false, streak: 0, weekCount: 0, week: [] };

  const todayDone = days[todayIdx].level > 0;

  let streak = 0;
  let i = todayDone ? todayIdx : todayIdx - 1;
  while (i >= 0 && days[i].level > 0) {
    streak += 1;
    i -= 1;
  }

  const weekStart = Math.floor(todayIdx / 7) * 7;
  const week: WeekDay[] = days.slice(weekStart, weekStart + 7).map((d, k) => ({
    date: d.date,
    label: LABELS[k],
    done: d.level > 0,
    isToday: weekStart + k === todayIdx,
    isFuture: d.level < 0,
  }));
  return { todayDone, streak, weekCount: week.filter((d) => d.done).length, week };
}
