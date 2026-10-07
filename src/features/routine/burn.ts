/**
 * 완료한 운동의 소모 kcal — **모든 화면이 이 모듈 하나만** 쓴다(2026-10-07 정리).
 *
 * 예전엔 캘린더·다짐·그룹·주간 MVP·설정 기록이 각자 반복문을 돌렸고, 그중 일부만
 * 러닝머신 경사(incline)를 넣어 **같은 운동이 화면마다 다른 kcal** 로 보였다.
 * 이제 행 하나 → kcal 규칙(스냅샷이 비면 카탈로그 기본값, 경사 포함)이 여기 한 곳이다.
 * 검수보고서: 헬쑤 전체 데이터 흐름 검수보고서 — 중복 계산.
 */

import { estimateConditioningKcal, strengthKcalForCompletion } from "@/features/routine/calories";
import { conditioningDefaults } from "@/features/routine/conditioning-catalog";

export { DEFAULT_WEIGHT_KG, weightOrDefault } from "@/features/routine/default-weight";

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** 완료한 근력운동 한 행(exercise_completions). */
export type StrengthDone = { exercise_id: string | null; sets: number | string | null };

/** 완료한 유산소·컨디셔닝 한 행(conditioning_completions). incline 은 없으면 기본값. */
export type CardioDone = {
  item_id: string | null;
  duration_min: number | string | null;
  speed: number | string | null;
  incline?: number | string | null;
};

/** 근력 한 건의 kcal(완료 스냅샷의 세트 수 기준). 운동 id 가 없으면 0. */
export function strengthDoneKcal(weightKg: number, r: StrengthDone): number {
  if (!r.exercise_id) return 0;
  return strengthKcalForCompletion(weightKg, r.exercise_id, num(r.sets) ?? 0);
}

/** 유산소 한 건의 kcal — 시간·속도·경사가 비면 카탈로그 기본값으로 채운다. */
export function cardioDoneKcal(weightKg: number, r: CardioDone): number {
  if (!r.item_id) return 0;
  const d = conditioningDefaults(r.item_id);
  return estimateConditioningKcal(
    weightKg,
    r.item_id,
    num(r.duration_min) ?? d.durationMin,
    num(r.speed) ?? d.speed,
    num(r.incline) ?? d.incline,
  );
}

/** 날짜별 소모 kcal 합계(반올림 전). 근력 + 유산소. */
export function burnKcalByDate(
  weightKg: number,
  strength: readonly (StrengthDone & { for_date: string })[],
  cardio: readonly (CardioDone & { for_date: string })[],
): Map<string, number> {
  const out = new Map<string, number>();
  const add = (d: string, v: number) => out.set(d, (out.get(d) ?? 0) + v);
  for (const r of strength) if (r.exercise_id) add(r.for_date, strengthDoneKcal(weightKg, r));
  for (const r of cardio) if (r.item_id) add(r.for_date, cardioDoneKcal(weightKg, r));
  return out;
}
