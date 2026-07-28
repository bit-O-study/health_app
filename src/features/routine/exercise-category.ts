/**
 * 운동 카테고리 — **대분류(부위) → 중분류(세부근육)** 2단 구조의 단일 진입점.
 *
 * 대분류: 가슴/등/어깨/팔/하체/코어 (MuscleId)
 * 중분류: 상부 대흉근·광배근·삼두 장두 … (SUB_MUSCLES 의 id)
 *
 * 운동마다 중분류 id 가 붙어 있어야 "가슴 상부만" 같은 필터가 정확히 동작한다.
 * 큐레이션 매핑(EXERCISE_SUB_MUSCLES)이 있으면 그걸 쓰고, 없으면 이름·타깃 문구로
 * 추론한다(sub-muscle-infer). 어느 쪽이든 **모든 운동이 반드시 대분류 1개 + 중분류
 * 1개 이상**을 갖는다 — tests/be/logic/exercise-category.test.ts 가 이를 강제한다.
 */
import { groupedByBodyPart } from "@/features/routine/exercise-catalog";
import { subMusclesForExercise } from "@/features/routine/muscle-detail";
import type { MuscleId } from "@/features/routine/muscle-map";

export type ExerciseCategory = {
  /** 대분류(부위) */
  muscle: MuscleId;
  /** 중분류(세부근육) id 목록 — 최소 1개 */
  subIds: string[];
};

let cache: Map<string, ExerciseCategory> | null = null;

function build(): Map<string, ExerciseCategory> {
  const out = new Map<string, ExerciseCategory>();
  const grouped = groupedByBodyPart();
  for (const muscle of Object.keys(grouped) as MuscleId[]) {
    for (const ex of grouped[muscle]) {
      if (out.has(ex.id)) continue; // 같은 운동이 여러 부위에 있으면 첫 부위를 대분류로
      out.set(ex.id, {
        muscle,
        subIds: subMusclesForExercise(ex.id)
          .filter((s) => s.muscle === muscle)
          .map((s) => s.id),
      });
    }
  }
  return out;
}

/** 운동 id → { 대분류, 중분류[] }. 카탈로그에 없으면 null. */
export function exerciseCategory(exerciseId: string): ExerciseCategory | null {
  cache ??= build();
  return cache.get(exerciseId) ?? null;
}

/** 전체 매핑(테스트·통계용). */
export function allExerciseCategories(): ReadonlyMap<string, ExerciseCategory> {
  cache ??= build();
  return cache;
}
