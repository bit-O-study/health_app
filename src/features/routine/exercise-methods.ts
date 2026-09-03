import "server-only";

import {
  EXERCISES,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import { EXTRA_METHODS } from "@/features/routine/exercise-catalog-extra-methods";

/**
 * 운동법 단계 조회 — **서버 전용**.
 *
 * 확장 카탈로그 1,237개의 운동법 텍스트(350KiB)는 클라이언트 번들에서 뺐다.
 * 그 문장을 실제로 읽는 곳은 운동모드 큐를 만드는 서버 컴포넌트뿐이라,
 * 서버에서 필요한 항목만 붙여 props 로 내려보낸다.
 *
 * 기본 카탈로그는 자기 데이터(`EXERCISES[id].equipments[].method`)를,
 * 확장 카탈로그는 분리된 `EXTRA_METHODS` 를 본다. 없으면 빈 배열.
 */
export function methodSteps(
  exerciseId: string,
  equipment: EquipmentId,
): string[] {
  const base = EXERCISES[exerciseId]?.equipments.find(
    (v) => v.equipment === equipment,
  )?.method;
  if (base && base.length > 0) return base;
  return EXTRA_METHODS[exerciseId]?.[equipment] ?? [];
}

/** 이 운동에 (어느 기구로든) 운동법 단계가 있는지 — 안내 노출 판단용. */
export function hasMethodSteps(exerciseId: string): boolean {
  const base = EXERCISES[exerciseId]?.equipments.some(
    (v) => (v.method?.length ?? 0) > 0,
  );
  if (base) return true;
  const extra = EXTRA_METHODS[exerciseId];
  return extra ? Object.values(extra).some((s) => s.length > 0) : false;
}
