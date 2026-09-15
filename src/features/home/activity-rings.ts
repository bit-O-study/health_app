/**
 * 홈 활동 링(아이폰 피트니스 앱 느낌) — 세 개의 링이 각각 얼마나 찼는지 계산하는 순수 로직.
 *
 * - 운동: 이번 주 운동한 날 / 주간 목표 일수(기본 4일)
 * - 식단: 오늘 먹은 kcal / 목표 kcal (기록이 없으면 0)
 * - 다짐: 오늘 완료한 다짐 / 오늘 진행 중인 다짐 (다짐이 없으면 0)
 *
 * 링은 100%를 넘으면 한 바퀴에서 멈춘다(넘친 만큼은 값 글자로만 보여준다).
 */

export type RingKey = "workout" | "diet" | "commit";

export type Ring = {
  key: RingKey;
  label: string;
  /** 0~100 (그리기용, 100에서 멈춤) */
  pct: number;
  /** 링 옆에 쓰는 값 — "2 / 4일" 처럼 */
  valueText: string;
};

export const WEEKLY_WORKOUT_GOAL_DAYS = 4;

function pct(done: number, total: number): number {
  if (!Number.isFinite(done) || !Number.isFinite(total) || total <= 0 || done <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

export function activityRings(input: {
  workoutDays: number;
  weeklyGoalDays?: number;
  eatenKcal: number;
  targetKcal: number;
  commitDone: number;
  commitTotal: number;
}): Ring[] {
  const goal = input.weeklyGoalDays ?? WEEKLY_WORKOUT_GOAL_DAYS;
  return [
    {
      key: "workout",
      label: "이번 주 운동",
      pct: pct(input.workoutDays, goal),
      valueText: `${input.workoutDays} / ${goal}일`,
    },
    {
      key: "diet",
      label: "식단",
      pct: pct(input.eatenKcal, input.targetKcal),
      valueText: `${Math.round(input.eatenKcal).toLocaleString()} / ${Math.round(input.targetKcal).toLocaleString()}kcal`,
    },
    {
      key: "commit",
      label: "오늘 다짐",
      pct: pct(input.commitDone, input.commitTotal),
      valueText: input.commitTotal > 0 ? `${input.commitDone} / ${input.commitTotal}` : "없음",
    },
  ];
}
