/** 주간 그룹 챌린지/목표 — 순수 로직(진행률 계산·라벨). 테스트 가능. */

export type ChallengeMetric = "kcal" | "workouts" | "days";

export const CHALLENGE_METRICS: {
  id: ChallengeMetric;
  label: string;
  unit: string;
}[] = [
  { id: "kcal", label: "그룹 합산 소비 kcal", unit: "kcal" },
  { id: "workouts", label: "그룹 합산 운동 횟수", unit: "회" },
  { id: "days", label: "그룹 합산 운동일수", unit: "일" },
];

export function isChallengeMetric(v: unknown): v is ChallengeMetric {
  return v === "kcal" || v === "workouts" || v === "days";
}

export function metricLabel(metric: ChallengeMetric): string {
  return CHALLENGE_METRICS.find((m) => m.id === metric)?.label ?? metric;
}

export function metricUnit(metric: ChallengeMetric): string {
  return CHALLENGE_METRICS.find((m) => m.id === metric)?.unit ?? "";
}

/** 멤버 통계에서 지표 값 하나를 뽑는다. */
export function metricValue(
  metric: ChallengeMetric,
  m: { kcal: number; workouts: number; days: number },
): number {
  return metric === "kcal" ? m.kcal : metric === "workouts" ? m.workouts : m.days;
}

export type ChallengeProgress = {
  metric: ChallengeMetric;
  target: number;
  current: number;
  pct: number;
  done: boolean;
};

/** 그룹 합산 진행률 — 멤버들의 지표를 모두 더해 목표와 비교. */
export function challengeProgress(
  metric: ChallengeMetric,
  target: number,
  members: { kcal: number; workouts: number; days: number }[],
): ChallengeProgress {
  const current = members.reduce((s, m) => s + metricValue(metric, m), 0);
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return { metric, target, current, pct, done: target > 0 && current >= target };
}
