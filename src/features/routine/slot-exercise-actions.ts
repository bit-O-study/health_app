"use server";

import { isFocusKey } from "@/features/routine/data";
import type { EquipmentId } from "@/features/routine/exercise-catalog-labels";
import {
  allExercisesForFocus,
  exercisesForFocus,
  getCatalogExercise,
  type CatalogExercise,
} from "@/features/routine/exercise-catalog";
import {
  allExercisesForSlot,
  focusExercisesForSlot,
  sideExercisesForSlot,
} from "@/features/routine/recommend";

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

function toOption(ex: CatalogExercise): SlotExerciseOption {
  return {
    id: ex.id,
    name: ex.name,
    target: ex.target,
    equipments: ex.equipments.map((e) => e.equipment),
  };
}

function cleanBlockIds(blockIds: unknown): string[] {
  return Array.isArray(blockIds)
    ? blockIds.filter((b): b is string => typeof b === "string")
    : [];
}

/**
 * @param wholeFocus 세부근육 블록을 무시하고 그 부위 전체를 준다(직접 담기).
 */
export async function exercisesForSlotAction(
  focus: string,
  blockIds: string[] = [],
  wholeFocus = false,
): Promise<SlotExerciseOption[]> {
  // 클라이언트가 보내는 값이라 그대로 믿지 않는다.
  if (!isFocusKey(focus)) return [];
  const list = wholeFocus
    ? allExercisesForFocus(focus)
    : allExercisesForSlot(focus, cleanBlockIds(blockIds));
  return list.map(toOption);
}

/** 한 번에 조회할 수 있는 운동 id 개수 — 편집기 한 화면의 행 수보다 넉넉하게. */
const MAX_IDS = 200;

/** 여러 슬롯의 목록을 **한 번에** 준다 — 영구 루틴 편집기는 7일치 부위를 한 화면에 편다.
 * 부위·세부블록이 같은 슬롯은 서버에서 한 번만 계산해 같은 결과를 나눠 준다
 * (7일 루틴이라도 실제로 다른 슬롯은 보통 여섯 개 이하). */
export async function exercisesForSlotsAction(
  specs: { key: string; focus: string; blockIds?: string[] }[],
): Promise<{ key: string; exercises: SlotExerciseOption[] }[]> {
  if (!Array.isArray(specs)) return [];
  const cache = new Map<string, SlotExerciseOption[]>();
  return specs.slice(0, MAX_IDS).map((spec) => {
    const key = String(spec?.key ?? "");
    const focus = spec?.focus;
    if (!isFocusKey(focus)) return { key, exercises: [] };
    const blocks = cleanBlockIds(spec.blockIds);
    const sig = `${focus}|${blocks.join(",")}`;
    let list = cache.get(sig);
    if (!list) {
      list = allExercisesForSlot(focus, blocks).map(toOption);
      cache.set(sig, list);
    }
    return { key, exercises: list };
  });
}

/**
 * 운동 id 목록 → 이름·타깃·기구. 편집기가 **이미 저장돼 있는 행**의 정보를 채울 때 쓴다.
 *
 * 그 행의 운동이 지금 부위 목록에 없을 수 있다(부위를 옮겼거나, 카탈로그에서 빠진 옛
 * 데이터거나). 예전엔 `getCatalogExercise` 로 클라이언트에서 찾았는데 그러자고 목록
 * 전체를 싣고 있었다.
 */
export async function exerciseOptionsByIdsAction(
  ids: string[],
): Promise<SlotExerciseOption[]> {
  if (!Array.isArray(ids)) return [];
  const unique = [
    ...new Set(ids.filter((id): id is string => typeof id === "string")),
  ].slice(0, MAX_IDS);
  return unique
    .map((id) => getCatalogExercise(id))
    .filter((ex): ex is CatalogExercise => ex !== undefined)
    .map(toOption);
}

/** '추천으로 채우기' 한 부위분 요청. */
export type RecommendSlotSpec = {
  focus: string;
  blockIds?: string[];
  /** 보조 슬롯이면 추천 개수를 보조 볼륨으로 제한한다. */
  isSide?: boolean;
};

/**
 * '추천으로 채우기' — 부위별 추천 운동을 **서버에서** 고른다.
 *
 * 세트·횟수·무게(`prescribe`)와 기구 선택(내 헬스장 우선)은 클라이언트에 남긴다 —
 * 둘 다 목록 데이터가 필요 없고, 사용자가 화면에서 바로 조절하는 값이다.
 * 부위 순서·중복 처리는 호출부가 그대로 하도록 **요청한 순서대로** 돌려준다.
 */
export async function recommendExercisesAction(
  specs: RecommendSlotSpec[],
  gender: "male" | "female",
): Promise<{ focus: string; exercises: SlotExerciseOption[] }[]> {
  if (!Array.isArray(specs)) return [];
  const g = gender === "female" ? "female" : "male";
  return specs.slice(0, MAX_IDS).map((spec) => {
    const focus = spec?.focus;
    // 부위가 아니면(휴식 포함) 추천할 게 없다 — 빈 목록으로 자리는 지킨다.
    if (!isFocusKey(focus)) return { focus: String(focus ?? ""), exercises: [] };
    const blockIds = cleanBlockIds(spec.blockIds);
    const list = spec.isSide
      ? sideExercisesForSlot(focus, blockIds, g)
      : blockIds.length > 0
        ? focusExercisesForSlot(focus, blockIds, g)
        : exercisesForFocus(focus, g);
    return { focus, exercises: list.map(toOption) };
  });
}
