/**
 * 3개월 목표와 진행률 — 라이트 2단계 혜택 1(2026-10-02, docs/lite-stage2-design-2026-10-02.html).
 *
 * 순수 모듈. 종목의 예상 1RM 추이(`oneRMSeries`)로 진행률·예상 도달일·필요 속도를 낸다. AI 없음.
 */
import type { Point } from "@/features/routine/progress";
import type { PlanId } from "@/features/billing/plans";

/** 요금제별 진행 중 목표 수 — 무료 1 · 라이트 이상 3(DB 트리거도 3에서 막는다). */
export function goalLimit(plan: PlanId): number {
  return plan === "free" ? 1 : 3;
}

/** 예상 도달일을 말하려면 이만큼 기록이 있어야 한다 — 두세 번으로 그은 직선은 거짓말을 한다. */
export const MIN_POINTS_FOR_ETA = 4;
/** 기울기는 최근 이 주 수의 기록으로만 본다(오래된 초보 시절 급성장이 끼면 낙관적이 된다). */
export const SLOPE_WEEKS = 6;

export type LiftGoal = {
  id: string;
  exerciseId: string;
  startKg: number;
  targetKg: number;
  startDate: string;
  targetDate: string;
  achievedAt: string | null;
};

export type GoalProgress = {
  /** 지금 예상 1RM(기록이 없으면 시작값). */
  currentKg: number;
  /** 0~100(넘으면 100). */
  pct: number;
  achieved: boolean;
  /** 주당 kg(최근 6주 최소제곱). 기록이 모자라면 null. */
  slopePerWeek: number | null;
  /** 지금 속도로 닿는 날. 기록이 모자라거나 정체(기울기 ≤ 0)면 null. */
  etaDate: string | null;
  /** 목표일 대비 며칠 빠른가(+) 늦은가(−). eta 없으면 null. */
  aheadDays: number | null;
  /** 목표일까지 남은 주. */
  weeksLeft: number;
  /** 남은 주에 주당 몇 kg 올려야 하나(이미 닿았거나 기간이 끝났으면 null). */
  neededPerWeek: number | null;
  /** 기울기가 0 이하 — 정체(정체 탈출로 연결). */
  stalled: boolean;
};

const DAY = 86_400_000;
const toT = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`);
const toYmd = (t: number) => new Date(t).toISOString().slice(0, 10);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** 최소제곱 기울기(kg/일). 점이 2개 미만이거나 날짜가 다 같으면 null. */
export function slopePerDay(points: readonly Point[]): number | null {
  if (points.length < 2) return null;
  const xs = points.map((p) => toT(p.date) / DAY);
  const ys = points.map((p) => p.value);
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const my = ys.reduce((s, y) => s + y, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

export function goalProgress(goal: LiftGoal, series: readonly Point[], today: string): GoalProgress {
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const currentKg = sorted.length ? sorted[sorted.length - 1].value : goal.startKg;
  const span = goal.targetKg - goal.startKg;
  const pct = span > 0 ? Math.max(0, Math.min(100, Math.round(((currentKg - goal.startKg) / span) * 100))) : 100;
  const achieved = !!goal.achievedAt || currentKg >= goal.targetKg;
  const weeksLeft = Math.max(0, Math.ceil((toT(goal.targetDate) - toT(today)) / (7 * DAY)));

  const recent = sorted.filter((p) => toT(p.date) >= toT(today) - SLOPE_WEEKS * 7 * DAY);
  const perDay = recent.length >= MIN_POINTS_FOR_ETA ? slopePerDay(recent) : null;
  const slopePerWeek = perDay == null ? null : round1(perDay * 7);
  const stalled = perDay != null && perDay <= 0;

  let etaDate: string | null = null;
  let aheadDays: number | null = null;
  if (!achieved && perDay != null && perDay > 0) {
    const eta = toT(today) + Math.ceil((goal.targetKg - currentKg) / perDay) * DAY;
    etaDate = toYmd(eta);
    aheadDays = Math.round((toT(goal.targetDate) - eta) / DAY);
  }
  const neededPerWeek = achieved || weeksLeft === 0 ? null : round1((goal.targetKg - currentKg) / weeksLeft);
  return { currentKg, pct: achieved ? 100 : pct, achieved, slopePerWeek, etaDate, aheadDays, weeksLeft, neededPerWeek, stalled };
}

/** 목표 무게 기본값 — 지금 +10%, 2.5kg 단위로 올림. */
export function suggestTargetKg(currentKg: number): number {
  return Math.max(2.5, Math.ceil((currentKg * 1.1) / 2.5) * 2.5);
}

/** 목표 날짜 기본값 — 3개월(91일) 뒤. */
export function defaultTargetDate(today: string): string {
  return toYmd(toT(today) + 91 * DAY);
}

/** 목표 입력 검사 — 서버 액션이 그대로 쓴다. 문제 없으면 null. */
export function validateGoalInput(
  input: { startKg: number; targetKg: number; targetDate: string },
  today: string,
): string | null {
  if (!Number.isFinite(input.targetKg) || input.targetKg <= 0 || input.targetKg > 1000) return "목표 무게를 확인해 주세요.";
  if (input.targetKg <= input.startKg) return "목표 무게는 지금보다 무거워야 해요.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)) return "날짜를 확인해 주세요.";
  const days = (toT(input.targetDate) - toT(today)) / DAY;
  if (days < 28) return "목표 날짜는 4주 뒤부터 정할 수 있어요.";
  if (days > 366) return "목표 날짜는 1년 안으로 정해 주세요.";
  return null;
}
