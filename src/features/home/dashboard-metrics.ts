/**
 * 홈 대시보드 파생 지표 — 순수 함수(테스트 가능). DB/네트워크 접근 없음.
 */

import { kcalToMinutes } from "@/features/routine/calories";

export type DietExerciseNeed = {
  targetKcal: number;
  eatenKcal: number;
  burnedKcal: number;
  /** 오늘 식단이 목표를 넘긴 만큼(태워야 할 kcal). 목표 이내면 0. */
  neededKcal: number;
  /** neededKcal 중 아직 운동으로 못 태운 만큼. */
  remainingKcal: number;
  /** neededKcal 대비 이미 태운 비율(0~100). 태울 필요가 없으면 100. */
  pct: number;
  /** remainingKcal 을 태우는 데 필요한 대략적인 운동 시간(분). */
  remainingMinutes: number;
};

/** 오늘 식단 기준 필요 운동량 — 섭취가 목표를 넘긴 만큼을 운동으로 상쇄한다고 본다. */
export function computeDietExerciseNeed(args: {
  targetKcal: number;
  eatenKcal: number;
  burnedKcal: number;
  weightKg: number | null;
}): DietExerciseNeed {
  const eatenKcal = Math.round(args.eatenKcal);
  const burnedKcal = Math.round(args.burnedKcal);
  const neededKcal = Math.max(0, eatenKcal - args.targetKcal);
  const remainingKcal = Math.max(0, neededKcal - burnedKcal);
  const pct = neededKcal > 0 ? Math.min(100, Math.round((burnedKcal / neededKcal) * 100)) : 100;
  return {
    targetKcal: args.targetKcal,
    eatenKcal,
    burnedKcal,
    neededKcal,
    remainingKcal,
    pct,
    remainingMinutes: kcalToMinutes(remainingKcal, args.weightKg),
  };
}

export type MacroRemaining = { protein: number; carbs: number; fat: number };

/** 탄단지 목표 대비 오늘 더 먹어야 하는 양(g). 이미 넘겼으면 0. */
export function computeMacroRemaining(
  target: MacroRemaining,
  eaten: MacroRemaining,
): MacroRemaining {
  return {
    protein: Math.max(0, Math.round(target.protein - eaten.protein)),
    carbs: Math.max(0, Math.round(target.carbs - eaten.carbs)),
    fat: Math.max(0, Math.round(target.fat - eaten.fat)),
  };
}

/** 잔디(컨트리뷰션) 그래프 한 칸. level=-1 은 아직 오지 않은 미래 날짜(빈 칸). */
export type ContributionDay = {
  date: string;
  level: -1 | 0 | 1 | 2 | 3 | 4;
  minutes: number;
};

/** 운동 시간(분) → 잔디 진하기 단계(0~4). */
export function levelForMinutes(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 20) return 1;
  if (minutes < 40) return 2;
  if (minutes < 60) return 3;
  return 4;
}

function ymdToEpochDay(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function epochDayToYmd(day: number): string {
  const dt = new Date(day * 86_400_000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 가입일부터 오늘까지 잔디 그래프를 그리는 데 필요한 주 수(최대 maxWeeks).
 * 가입한 지 얼마 안 된 사용자에게 대부분 빈 칸인 1년치 그래프를 보여주지
 * 않기 위함 — 가입일 이후 기간만큼만 그린다.
 */
export function weeksSinceJoin(
  joinYmd: string,
  todayYmd: string,
  maxWeeks: number,
): number {
  const days = ymdToEpochDay(todayYmd) - ymdToEpochDay(joinYmd) + 1;
  const weeks = Math.max(1, Math.ceil(days / 7));
  return Math.min(maxWeeks, weeks);
}

/**
 * GitHub 스타일 잔디 그리드 — 일요일 시작, `weeks`주 × 7일. 오늘이 포함된 주의
 * 미래 날짜는 level=-1(빈 칸)로 채워 그리드 정렬만 맞춘다.
 * joinYmd(가입일) 를 주면 그 이전 날짜도 같은 빈 칸(level=-1)으로 처리한다 —
 * "가입 전"을 "가입 후 운동 안 함(level=0)"과 구분하기 위함.
 */
export function buildContributionGrid(
  durationSecByDate: Map<string, number>,
  todayYmd: string,
  weeks = 53,
  joinYmd?: string,
): ContributionDay[] {
  const todayEpoch = ymdToEpochDay(todayYmd);
  const joinEpoch = joinYmd ? ymdToEpochDay(joinYmd) : null;
  const dow = new Date(todayEpoch * 86_400_000).getUTCDay(); // 0=일 ~ 6=토
  const satEpoch = todayEpoch + (6 - dow);
  const sunEpoch = satEpoch - (weeks * 7 - 1);

  const days: ContributionDay[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const epoch = sunEpoch + i;
    const date = epochDayToYmd(epoch);
    if (epoch > todayEpoch || (joinEpoch !== null && epoch < joinEpoch)) {
      days.push({ date, level: -1, minutes: 0 });
      continue;
    }
    const minutes = Math.round((durationSecByDate.get(date) ?? 0) / 60);
    days.push({ date, level: levelForMinutes(minutes), minutes });
  }
  return days;
}