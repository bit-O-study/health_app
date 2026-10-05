/**
 * 개인 신기록 — 무료 기능(2026-09-30, `docs/ai-trainer-plans-2026-09-30.html` 추가 제안).
 *
 * 순수 모듈. 세트를 끝낸 순간 그 세트의 예상 1RM 이 **오늘 전까지의 최고**보다 높으면 신기록.
 * 예상 1RM 을 쓰는 이유: 무게만 보면 "60kg 10회"가 "62.5kg 3회"보다 약한 기록이 된다.
 */
import { estimate1RM, recordOneRM, type ProgressRecord } from "@/features/routine/progress";

/** 이만큼은 올라야 신기록이라고 부른다 — 반올림 차이(0.1kg)로 축하하면 싱겁다. */
export const PR_MIN_GAIN_KG = 0.5;

/** 운동별 지난 최고 예상 1RM(kg). 무게 없는 기록(맨몸·시간)은 빼고 센다. */
export function bestOneRmByExercise(records: readonly ProgressRecord[]): Record<string, number> {
  const best: Record<string, number> = {};
  for (const r of records) {
    if (r.status !== "done" || !r.exerciseId) continue;
    const v = recordOneRM(r);
    if (v > 0 && v > (best[r.exerciseId] ?? 0)) best[r.exerciseId] = v;
  }
  return best;
}

export type NewRecord = { oneRmKg: number; gainKg: number };

/**
 * 이번 세트가 신기록인가. 지난 기록이 없으면(처음 하는 운동) **신기록이라 하지 않는다** —
 * 첫 세트마다 축하하면 알림이 의미를 잃는다.
 */
export function checkNewRecord(
  previousBestKg: number | null | undefined,
  weightKg: number | null,
  reps: number | null,
): NewRecord | null {
  if (!previousBestKg || previousBestKg <= 0) return null;
  const oneRm = estimate1RM(weightKg, reps);
  if (oneRm <= 0) return null;
  const gain = Math.round((oneRm - previousBestKg) * 10) / 10;
  if (gain < PR_MIN_GAIN_KG) return null;
  return { oneRmKg: oneRm, gainKg: gain };
}

export function newRecordMessage(exerciseName: string, rec: NewRecord): string {
  return `신기록! ${exerciseName} 예상 1RM ${rec.oneRmKg}kg (+${rec.gainKg}kg)`;
}
