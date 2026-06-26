/**
 * 추천 운동 선택 로직 — 주(主)/보조 슬롯에 넣을 운동을 고른다.
 *
 * exercise-catalog(운동·블록 데이터)와 muscle-detail(세부 근육 매핑)을 둘 다 써서
 * "세부 근육 균형" 추천을 만든다. 두 데이터 모듈이 서로를 import 하는 순환이 있어
 * (catalog ↔ muscle-detail/muscle-map), 이 선택 로직만 별도 모듈로 빼서 양쪽을
 * 단방향으로 import 한다 — 순환 없이.
 *
 * 호출부(3곳)는 모두 여기서 가져온다:
 *  - actions.fillMissingFocusesAction
 *  - plan-actions.registerRecommendedPlanAction
 *  - plan-editor.doRecommendFocus
 */

import {
  EXERCISES,
  FOCUS_EXERCISES,
  FOCUS_EXERCISES_FEMALE,
  SIDE_FOCUS_EXERCISES,
  SIDE_BLOCK_EXERCISES,
  MAIN_BLOCK_EXERCISES,
  MAIN_SLOT_COUNT,
  exercisesForFocus,
  type CatalogExercise,
  type FocusKey,
} from "@/features/routine/exercise-catalog";
import {
  SUB_MUSCLES,
  EXERCISE_SUB_MUSCLES,
} from "@/features/routine/muscle-detail";

/**
 * 한 일차의 보조 슬롯(focus + 기여 블록 id들)에 대한 추천 운동.
 * 블록별 목록(이두/삼두 구분) 우선, 없으면 focus 기본 사이드 목록, 그래도 없으면
 * 일반 추천 목록 앞 2개. 블록별 2개씩이므로 이두+삼두면 합쳐서 4개가 된다.
 */
export function sideExercisesForSlot(
  focus: FocusKey,
  blockIds: string[],
  gender: "male" | "female" = "male",
): CatalogExercise[] {
  const ids: string[] = [];
  for (const b of blockIds) {
    const list = SIDE_BLOCK_EXERCISES[b] ?? SIDE_FOCUS_EXERCISES[focus] ?? [];
    for (const id of list) if (!ids.includes(id)) ids.push(id);
  }
  if (ids.length === 0) return exercisesForFocus(focus, gender).slice(0, 2);
  return ids.map((id) => EXERCISES[id]).filter(Boolean);
}

/**
 * 부위 추천을 세부 근육별로 골고루 뽑는다(예: 어깨 = 전면·측면·후면 각 1개).
 * 후보 풀 = 큐레이션 목록(킹 운동) → 세부근육 블록. 세부 근육 정의 순서대로
 * 아직 안 뽑힌 그 근육 운동을 풀에서 가장 앞선 것으로 1개씩 채우고, 슬롯이 남으면
 * 풀에서 마저 채운다. 세부 근육 정의가 없는 합성 부위(fullbody 등)는 큐레이션 그대로.
 * (예전엔 큐레이션 목록을 앞에서 4개 자르기만 해 한쪽 갈래에 쏠리는 경우가 있었다.)
 */
function balancedFocusExercises(
  focus: FocusKey,
  gender: "male" | "female",
  count: number,
): CatalogExercise[] {
  const subs = SUB_MUSCLES[focus as keyof typeof SUB_MUSCLES] as
    | { id: string }[]
    | undefined;
  if (!subs || subs.length === 0) {
    return exercisesForFocus(focus, gender).slice(0, count);
  }
  const pool: string[] = [];
  const add = (id: string) => {
    if (id && EXERCISES[id] && !pool.includes(id)) pool.push(id);
  };
  const curated =
    (gender === "female" ? FOCUS_EXERCISES_FEMALE : FOCUS_EXERCISES)[focus] ?? [];
  for (const id of curated) add(id);
  for (const s of subs) for (const id of MAIN_BLOCK_EXERCISES[s.id] ?? []) add(id);

  const picked: string[] = [];
  // 1) 세부 근육마다 1개씩(정의 순서) — 풀 앞쪽(킹) 우선
  for (const s of subs) {
    if (picked.length >= count) break;
    const cand = pool.find(
      (id) =>
        !picked.includes(id) && (EXERCISE_SUB_MUSCLES[id] ?? []).includes(s.id),
    );
    if (cand) picked.push(cand);
  }
  // 2) 남는 슬롯은 풀 순서대로(세부 매핑 없는 킹 포함)
  for (const id of pool) {
    if (picked.length >= count) break;
    if (!picked.includes(id)) picked.push(id);
  }
  return picked
    .map((id) => EXERCISES[id])
    .filter(Boolean)
    .slice(0, count);
}

/**
 * 주(主) 슬롯의 추천 운동.
 * 블록 id 가 전부 세부 블록(이두/삼두)이면 그 근육 **전용** 목록을 쓰고,
 * 그 외(가슴/등/팔 통째 등)는 세부 근육 균형 추천(balancedFocusExercises)을 쓴다.
 * → "이두만 추가했는데 삼두가 따라 들어오는" 문제와 "한쪽 갈래 쏠림"을 모두 막는다.
 */
export function focusExercisesForSlot(
  focus: FocusKey,
  blockIds: string[],
  gender: "male" | "female" = "male",
): CatalogExercise[] {
  const blockLists = blockIds.map((b) => MAIN_BLOCK_EXERCISES[b]);
  // blockIds 가 비어있지 않고 전부 세부 블록일 때만 블록 전용 목록을 합쳐 쓴다.
  if (blockIds.length > 0 && blockLists.every(Boolean)) {
    const ids: string[] = [];
    for (const list of blockLists)
      for (const id of list!) if (!ids.includes(id)) ids.push(id);
    return ids
      .map((id) => EXERCISES[id])
      .filter(Boolean)
      .slice(0, MAIN_SLOT_COUNT);
  }
  // 주 부위는 세부 근육 균형으로 4개(보조는 sideExercisesForSlot 에서 2개).
  return balancedFocusExercises(focus, gender, MAIN_SLOT_COUNT);
}
