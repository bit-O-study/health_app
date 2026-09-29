/**
 * 캘린더 3단계(2026-09-29) — 순수 로직.
 *  - 운동한 날 판정 · 운동량 농도(칸 색) · 달 요약 수치(공유 이미지)
 *  - 앞으로 할 루틴 이름(읽기 전용 — 원칙 2: 캘린더는 루틴을 **바꾸지 않는다**)
 */

import { shiftYmd } from "@/features/routine/progress";
import {
  CUSTOM_VARIANT_ID,
  DAY_BLOCKS,
  routineDayOffset,
  type DayBlockId,
  type DayPlan,
} from "@/features/routine/data";

/** 운동했는지 판단에 필요한 그날 값(캘린더 DaySummary 의 일부). */
export type ActivityDay = {
  exerciseKcal: number;
  durationSec: number;
  didWeight: boolean;
  runM: number;
};

/** 운동한 날 — 걷기만 한 날은 빼고, 근력·유산소·런닝·운동 시간 중 하나라도 있으면. */
export function isActiveDay(d: ActivityDay | undefined | null): boolean {
  if (!d) return false;
  return d.didWeight || d.runM > 0 || d.exerciseKcal > 0 || d.durationSec > 0;
}

/**
 * 칸 색 진하기 0~3 — 그 기간에서 운동 kcal 이 가장 많은 날 대비.
 * 0 = 안 함, 1 = 가볍게(~⅓), 2 = 보통(~⅔), 3 = 많이.
 * 걷기는 빼고 운동 kcal 만 본다(걸음 많은 날이 운동한 날처럼 칠해지지 않게).
 */
export function activityLevel(exerciseKcal: number, maxKcal: number): 0 | 1 | 2 | 3 {
  if (!(exerciseKcal > 0) || !(maxKcal > 0)) return 0;
  const r = exerciseKcal / maxKcal;
  return r > 2 / 3 ? 3 : r > 1 / 3 ? 2 : 1;
}

/** 날짜 목록(아무 순서) 안에서 가장 긴 연속 일수. */
export function longestRun(dates: Iterable<string>): number {
  const days = [...new Set(dates)]
    .map((d) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 86_400_000))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  let best = 0;
  let cur = 0;
  for (let i = 0; i < days.length; i++) {
    cur = i > 0 && days[i] === days[i - 1] + 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
  }
  return best;
}

export type MonthStats = {
  activeDays: number;
  weightDays: number;
  runKm: number;
  longestStreak: number;
  exerciseKcal: number;
};

/** 한 달 요약 — 공유 이미지·요약에 쓰는 숫자. */
export function monthStats(byDate: Iterable<[string, ActivityDay]>): MonthStats {
  const active: string[] = [];
  let weightDays = 0;
  let runM = 0;
  let exerciseKcal = 0;
  for (const [date, d] of byDate) {
    if (isActiveDay(d)) active.push(date);
    if (d.didWeight) weightDays += 1;
    runM += Math.max(0, d.runM);
    exerciseKcal += Math.max(0, d.exerciseKcal);
  }
  return {
    activeDays: active.length,
    weightDays,
    runKm: Math.round(runM / 100) / 10,
    longestStreak: longestRun(active),
    exerciseKcal: Math.round(exerciseKcal),
  };
}

/** 앞으로 할 루틴 계산에 필요한 최소 정보. */
export type RoutineCycle = {
  startDate: string;
  variantId: string;
  customWeek: DayBlockId[][] | null;
  /** resolveRoutine(...).variant.week — 7일 주기. */
  week: readonly DayPlan[];
};

/**
 * 그 날짜에 루틴상 예정된 부위 이름("하체", "가슴 · 팔", "휴식").
 * **루틴 주기만** 본다 — '오늘만 변경'(daily_plan)은 오늘 하루짜리라 미래 날짜엔 없다(원칙 2).
 */
export function plannedLabel(cycle: RoutineCycle, date: string): { label: string; rest: boolean } {
  const i = routineDayOffset(cycle.startDate, date);
  if (cycle.variantId === CUSTOM_VARIANT_ID && cycle.customWeek?.[i]) {
    const blocks = cycle.customWeek[i];
    const rest = blocks.length === 0 || blocks.every((b) => b === "rest");
    return {
      label: rest ? "휴식" : blocks.map((b) => DAY_BLOCKS[b]?.label ?? b).join(" · "),
      rest,
    };
  }
  const day = cycle.week[i];
  if (!day) return { label: "", rest: false };
  return { label: day.focus, rest: day.tone === "rest" };
}

/**
 * 지금 연속 운동 일수 — 오늘부터 거꾸로.
 * **오늘은 아직 안 했을 수 있다** — 오늘이 비어 있으면 어제부터 센다(홈 연속일수와 같은 규칙,
 * `launcher/streak.ts`). 저녁에 운동하는 사람이 아침에 열었다고 끊긴 것처럼 보이면 안 된다.
 */
export function currentStreak(active: ReadonlySet<string>, today: string, maxDays = 366): number {
  const dayMs = 86_400_000;
  let t = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(t)) return 0;
  const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  if (!active.has(ymd(t))) t -= dayMs;
  let n = 0;
  while (n < maxDays && active.has(ymd(t))) {
    n += 1;
    t -= dayMs;
  }
  return n;
}

/** 연속 일수를 찾을 때 한 번에 보는 날 수 — 이 안에서 끊기면 더 조회하지 않는다. */
export const STREAK_CHUNK_DAYS = 60;

/**
 * 연속 운동 일수를 **조각 단위로** 센다 — 조회 함수를 받아 필요한 만큼만 거꾸로 부른다.
 * 연속이 이번 조각의 첫날까지 닿지 않으면(= 조각 안에서 끊김) 거기서 멈춘다.
 * 한 조각(60일)이 조회 한 번의 1,000행 한도를 넘지 않게 잡은 크기다.
 */
export async function streakByChunks(
  today: string,
  fetchActive: (from: string, to: string) => Promise<Iterable<string>>,
  chunkDays = STREAK_CHUNK_DAYS,
  maxDays = 366,
): Promise<number> {
  const active = new Set<string>();
  let to = today;
  for (let fetched = 0; fetched < maxDays; fetched += chunkDays) {
    const from = shiftYmd(to, -(chunkDays - 1));
    for (const d of await fetchActive(from, to)) active.add(d);
    const streak = currentStreak(active, today, maxDays);
    if (!active.has(from) || streak < fetched + chunkDays - 1) return streak;
    to = shiftYmd(from, -1);
  }
  return currentStreak(active, today, maxDays);
}
