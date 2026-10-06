export type WorkoutCondition = "light" | "normal" | "good";

export const WORKOUT_CONDITIONS: { id: WorkoutCondition; label: string }[] = [
  { id: "light", label: "피곤해요 · 세트 −1" },
  { id: "normal", label: "보통 · 계획대로" },
  { id: "good", label: "좋아요 · 세트 +1" },
];

/** 항상 원래 계획 기준. 반복 선택해도 누적 증감하지 않고 진행한 세트는 보존한다. */
export function conditionSets(planned: number, done: number, condition: WorkoutCondition): number {
  const base = Number.isFinite(planned) ? Math.max(1, Math.floor(planned)) : 1;
  const completed = Number.isFinite(done) ? Math.max(0, Math.floor(done)) : 0;
  const delta = condition === "light" ? -1 : condition === "good" ? 1 : 0;
  return Math.max(completed + 1, Math.min(20, Math.max(1, base + delta)));
}
