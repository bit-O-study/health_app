"use server";

import { isFocusKey } from "@/features/routine/data";
import type { EquipmentId } from "@/features/routine/exercise-catalog-labels";
import { allExercisesForSlot } from "@/features/routine/recommend";

/**
 * 슬롯(부위 + 세부근육 블록)의 운동 목록을 **서버에서** 준다 — 클라이언트 번들 다이어트.
 *
 * 예전엔 '운동 추가' 폼이 `allExercisesForSlot` 을 직접 불러서, 오늘 계획 화면을 여는
 * 것만으로 카탈로그 1,237개(274 KiB)가 다운로드·파싱되고 그대로 WebView 힙에 남았다.
 * 목록이 실제로 필요한 건 편집 모드에서 '운동 추가' 를 눌렀을 때뿐이라, 그 순간
 * 고른 부위 하나 분량만 받아온다.
 */

/** 선택 폼이 쓰는 최소 필드 — 운동법·설명은 목록에서 안 쓴다. */
export type SlotExerciseOption = {
  id: string;
  name: string;
  target: string;
  /** 기구 드롭다운용 — 순서 그대로(첫 번째가 기본값). */
  equipments: EquipmentId[];
};

export async function exercisesForSlotAction(
  focus: string,
  blockIds: string[] = [],
): Promise<SlotExerciseOption[]> {
  // 클라이언트가 보내는 값이라 그대로 믿지 않는다.
  if (!isFocusKey(focus)) return [];
  const blocks = Array.isArray(blockIds)
    ? blockIds.filter((b): b is string => typeof b === "string")
    : [];
  return allExercisesForSlot(focus, blocks).map((ex) => ({
    id: ex.id,
    name: ex.name,
    target: ex.target,
    equipments: ex.equipments.map((e) => e.equipment),
  }));
}
