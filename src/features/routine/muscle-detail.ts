/**
 * 운동 id 만으로 세부 근육을 찾는 함수들 — **운동 카탈로그가 필요하다**.
 *
 * 데이터·순수 함수는 `sub-muscles.ts` 에 있고 여기서 그대로 재수출한다
 * (기존 import 경로 유지). 이름·타깃을 이미 아는 화면은 목록 데이터를 안 끌도록
 * `sub-muscles.ts` 의 `subMusclesForExerciseData` 를 쓴다.
 */

import {
  ALL_EXERCISES,
  getCatalogExercise,
} from "@/features/routine/exercise-catalog";
import {
  subMusclesForExerciseData,
  type SubMuscle,
} from "@/features/routine/sub-muscles";

export * from "@/features/routine/sub-muscles";

/**
 * 운동 → 특화 세부 근육 목록.
 * 명시 매핑이 있으면 그것을, 없으면 그 운동의 이름·타깃 문구로 추론한다.
 * (예전엔 부위 기본값 3개를 통째로 줬는데, 그러면 "가슴 상부만" 같은 필터가
 *  사실상 전부 통과해 무의미했다 — sub-muscle-infer 참고.)
 */
export function subMusclesForExercise(exerciseId: string): SubMuscle[] {
  const ex = getCatalogExercise(exerciseId);
  if (!ex) return [];
  return subMusclesForExerciseData(exerciseId, ex.name, ex.target);
}

/** 세부 근육 → 그 근육에 특화된(또는 폴백으로 걸린) 운동 id 목록. */
export function exerciseIdsForSubMuscle(subId: string): string[] {
  const ids: string[] = [];
  for (const ex of ALL_EXERCISES) {
    if (
      subMusclesForExerciseData(ex.id, ex.name, ex.target).some(
        (s) => s.id === subId,
      )
    ) {
      ids.push(ex.id);
    }
  }
  return ids;
}
