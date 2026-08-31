/**
 * 근육 부위별 **운동 목록** — 목록 데이터(1,237개)가 필요한 함수만 모아 둔 모듈.
 *
 * `muscle-map.ts` 는 마네킹·배지처럼 부위 매핑만 쓰는 화면이 많아서, 목록이 필요한
 * 이 두 함수를 여기로 분리했다. 그래야 마네킹 하나 띄우자고 274 KiB 를 안 싣는다.
 * (목록·검색 UI 에서만 import 할 것.)
 */

import { groupedByBodyPart } from "@/features/routine/exercise-catalog";
import type { CatalogExercise } from "@/features/routine/exercise-catalog-labels";
import type { MuscleId } from "@/features/routine/muscle-map";

/**
 * 한 근육 부위에 매핑된 모든 카탈로그 운동.
 * 카탈로그의 1차 부위(primaryBodyPart) 그룹핑을 그대로 사용한다.
 */
export function exercisesForMuscle(id: MuscleId): CatalogExercise[] {
  return groupedByBodyPart()[id] ?? [];
}

/** 한 근육 부위의 운동 개수 */
export function exerciseCountForMuscle(id: MuscleId): number {
  return exercisesForMuscle(id).length;
}
