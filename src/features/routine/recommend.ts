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
 *  - plan-editor.doRecommendFocus (→ slot-exercise-actions.recommendExercisesAction)
 *
 * 2026-09-25 고도화(docs/routine-recommend-review-2026-09-25.html):
 *  - 1단계: 부위별 **필수 동작 패턴**을 먼저 채운다(recommend-patterns) · 경력별 순서 ·
 *    같은 주에 같은 부위가 또 나오면 A/B 로 번갈아(`variant`).
 *  - 2단계: 이번 주 0세트 세부근육을 먼저(`weakSubs`) · 자주 건너뛴 운동은 뒤로(`avoid`) ·
 *    고른 이유 한 줄(`reason`).
 *  이 정보는 전부 **마지막 선택 인자 `ctx`** 로 받는다 — 안 넘기면 중급·A·기록 없음으로 본다.
 *
 * 🔴 **내 헬스장 보유 기구를 반영한다.** 랙이 없는 헬스장에 스쿼트를 추천해두면
 * 사용자는 그 칸을 매번 손으로 갈아야 한다. 호출부는 `gym` 인자로 보유 기구를
 * 넘긴다(안 넘기면 미설정 취급 = 필터 없음). 다만 **전부 걸러지면 원본을 쓴다** —
 * 기구 판정이 5종 카테고리라 정확하지 않아, 빈 추천을 만드느니 남겨 둔다.
 */

import {
  EXERCISES,
  FOCUS_EXERCISES,
  FOCUS_EXERCISES_FEMALE,
  SIDE_FOCUS_EXERCISES,
  SIDE_BLOCK_EXERCISES,
  MAIN_BLOCK_EXERCISES,
  MAIN_SLOT_COUNT,
  allExercisesForFocus,
  exercisesForFocus,
  type CatalogExercise,
  type FocusKey,
} from "@/features/routine/exercise-catalog";
import {
  SUB_MUSCLES,
  EXERCISE_SUB_MUSCLES,
  subMusclesForExercise,
} from "@/features/routine/muscle-detail";
import {
  BEGINNER_FIRST_SLOT_AVOID,
  movementPatternsFor,
} from "@/features/routine/recommend-patterns";
import {
  isExerciseAvailable,
  keepAvailableExercises,
} from "@/features/gym/gym-equipment-mapping";

/**
 * 내 헬스장 보유 기구. `null` 이면 미설정 — 필터하지 않는다.
 * 추천 함수는 전부 이걸 **마지막 선택 인자**로 받는다(안 넘기면 예전과 같은 동작).
 */
export type GymEquipmentSet = ReadonlySet<string> | null;

/**
 * 추천을 사람·기록에 맞추는 정보(전부 선택).
 * - experience : 입문이면 머신·안정적인 변형을 앞에, 첫 칸엔 고위험 바벨 운동을 두지 않는다.
 * - variant    : 같은 주에 같은 부위가 몇 번째로 나오는지(0=A, 1=B …). 필수 동작은 같고 운동만 바뀐다.
 * - weakSubs   : 이번 주 0세트 세부근육 id — 그 근육을 치는 운동을 먼저.
 * - avoid      : 최근 자주 건너뛴 운동 id — 빼지는 않고 뒤로 미룬다.
 */
export type RecommendContext = {
  experience?: "beginner" | "intermediate" | "advanced";
  variant?: number;
  weakSubs?: ReadonlySet<string>;
  avoid?: ReadonlySet<string>;
};

/** 추천 한 칸 — 운동 + 왜 골랐는지 한 줄. */
export type RecommendedPick = { exercise: CatalogExercise; reason: string };

const EMPTY: ReadonlySet<string> = new Set();

const SUB_LABEL: Record<string, string> = Object.fromEntries(
  Object.values(SUB_MUSCLES)
    .flat()
    .map((sub) => [sub.id, sub.label]),
);

/** 같은 주에서 이 (부위) 슬롯이 몇 번째인지 — A/B 변형 번호. 보조 슬롯은 세지 않는다. */
export function focusVariantIndex(
  slots: readonly { dayIndex: number; focus: string; isSide?: boolean }[],
  dayIndex: number,
  focus: string,
): number {
  return slots.filter(
    (s) => !s.isSide && s.focus === focus && s.dayIndex < dayIndex,
  ).length;
}

/** 후보 id 목록에서 헬스장에서 할 수 있는 것만. 전부 걸러지면 원본 그대로. */
function keepDoableIds(ids: readonly string[], gym: GymEquipmentSet): string[] {
  if (gym === null) return [...ids];
  const doable = ids.filter((id) => {
    const ex = EXERCISES[id];
    return ex ? isExerciseAvailable(ex, gym) : false;
  });
  return doable.length > 0 ? doable : [...ids];
}

/**
 * 부위 기본 추천 목록을 헬스장 기준으로 거른 것.
 * 세부근육 블록 없이 부위만으로 추천할 때 쓴다(오늘만 부위 바꾸기 등).
 */
export function recommendedExercisesForFocus(
  focus: FocusKey,
  gender: "male" | "female" = "male",
  gym: GymEquipmentSet = null,
  ctx: RecommendContext = {},
): CatalogExercise[] {
  // 필수 동작 4칸을 앞에, 나머지 큐레이션은 그 뒤에 — 목록 길이는 예전과 같게 유지한다.
  const rest = keepAvailableExercises(exercisesForFocus(focus, gender), gym);
  const picks = recommendFocusPicks(focus, gender, MAIN_SLOT_COUNT, gym, ctx).map(
    (p) => p.exercise,
  );
  const ids = new Set(picks.map((e) => e.id));
  return [...picks, ...rest.filter((e) => !ids.has(e.id))].slice(
    0,
    Math.max(rest.length, picks.length),
  );
}

/**
 * 전체 부위 블록과 세부 블록을 같이 골랐으면 세부 블록을 우선한다.
 * 예: ["arm", "biceps"]를 arm 전체 추천으로 폴백시키면 삼두가 다시 섞인다.
 */
function specificBlockIds(blockIds: string[]): string[] {
  const specific = blockIds.filter((b) => MAIN_BLOCK_EXERCISES[b]);
  return specific.length > 0 ? specific : blockIds;
}

function subIdsForBlock(blockId: string): string[] {
  if (blockId === "biceps") {
    return ["arm-biceps-long", "arm-biceps-short"];
  }
  if (blockId === "triceps") {
    return [
      "arm-triceps-long",
      "arm-triceps-lateral",
      "arm-triceps-medial",
    ];
  }
  return [blockId];
}

/**
 * 한 일차의 보조 슬롯(focus + 기여 블록 id들)에 대한 추천 운동.
 * 블록별 목록(이두/삼두 구분) 우선, 없으면 focus 기본 사이드 목록, 그래도 없으면
 * 일반 추천 목록 앞 2개. 블록별 2개씩이므로 이두+삼두면 합쳐서 4개가 된다.
 */
export function sideExercisesForSlot(
  focus: FocusKey,
  blockIds: string[],
  gender: "male" | "female" = "male",
  gym: GymEquipmentSet = null,
): CatalogExercise[] {
  const ids: string[] = [];
  for (const b of specificBlockIds(blockIds)) {
    // 블록마다 따로 거른다 — 한 블록이 통째로 걸러져도 다른 블록이 자리를 메우지
    // 않게(이두+삼두인데 삼두만 남는 식으로 쏠리면 안 된다).
    for (const id of keepDoableIds(
      SIDE_BLOCK_EXERCISES[b] ?? SIDE_FOCUS_EXERCISES[focus] ?? [],
      gym,
    )) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  if (ids.length === 0) {
    return recommendedExercisesForFocus(focus, gender, gym).slice(0, 2);
  }
  return ids.map((id) => EXERCISES[id]).filter(Boolean);
}

/**
 * 직접 등록 드롭다운도 슬롯의 세부근육 범위를 지킨다.
 * 추천만 이두 전용이어도 수동 추가가 arm 전체를 열면 삼두가 다시 섞일 수 있다.
 */
export function allExercisesForSlot(
  focus: FocusKey,
  blockIds: string[],
): CatalogExercise[] {
  const base = allExercisesForFocus(focus);
  const specific = specificBlockIds(blockIds).filter(
    (b) => MAIN_BLOCK_EXERCISES[b],
  );
  const wanted = new Set(specific.flatMap(subIdsForBlock));

  if (wanted.size > 0) {
    return base.filter((ex) =>
      subMusclesForExercise(ex.id).some((sub) => wanted.has(sub.id)),
    );
  }

  // 합성 부위의 직접 팔 운동도 동작 방향에 맞게 제한한다.
  if (focus === "push" || focus === "pull") {
    return base.filter((ex) => {
      const subIds = subMusclesForExercise(ex.id).map((sub) => sub.id);
      const isDirectArm = subIds.some((id) => id.startsWith("arm-"));
      if (!isDirectArm) return true;
      return focus === "push"
        ? subIds.some((id) => id.startsWith("arm-triceps"))
        : subIds.some(
            (id) => id.startsWith("arm-biceps") || id === "arm-forearm",
          );
    });
  }

  return base;
}

/** 후보를 헬스장·회피 기준으로 정리 — 헬스장에서 못 하는 건 빼고, 자주 건너뛴 건 뒤로. */
function arrangeCandidates(
  ids: readonly string[],
  gym: GymEquipmentSet,
  avoid: ReadonlySet<string>,
): string[] {
  const known = ids.filter((id) => EXERCISES[id]);
  const doable =
    gym === null ? known : known.filter((id) => isExerciseAvailable(EXERCISES[id], gym));
  return [
    ...doable.filter((id) => !avoid.has(id)),
    ...doable.filter((id) => avoid.has(id)),
  ];
}

function weakHits(id: string, weak: ReadonlySet<string>): string[] {
  return (EXERCISE_SUB_MUSCLES[id] ?? []).filter((sub) => weak.has(sub));
}

function weakNote(id: string, weak: ReadonlySet<string>, label = ""): string {
  const hit = weakHits(id, weak)[0];
  if (!hit) return "";
  const name = SUB_LABEL[hit] ?? hit;
  // 동작 이름에 이미 근육 이름이 있으면(예: '… · 종아리') 되풀이하지 않는다.
  return label.includes(name) ? " · 이번 주 0세트" : ` · ${name} 이번 주 0세트`;
}

/**
 * 부위 추천 — 필수 동작 패턴 → 세부근육 균형 순서로 `count` 칸을 채운다.
 *
 * 1) 패턴마다 한 칸: 경력 순서(입문이면 `beginner`)의 후보 중, 이번 주 0세트 세부근육을
 *    치는 걸 먼저, A/B 는 `variant` 번째 후보. 입문 첫 칸엔 고위험 바벨 운동을 두지 않는다.
 * 2) 남는 칸: 아직 안 친 세부근육(0세트 먼저)을 큐레이션 → 세부근육 블록 풀에서 채운다.
 * 3) 그래도 남으면 풀 순서대로.
 * 패턴이 없는 부위(core 등)는 2)부터 — 예전 세부근육 균형과 같다.
 */
export function recommendFocusPicks(
  focus: FocusKey,
  gender: "male" | "female",
  count: number,
  gym: GymEquipmentSet = null,
  ctx: RecommendContext = {},
): RecommendedPick[] {
  const beginner = ctx.experience === "beginner";
  const variant = Math.max(0, Math.floor(ctx.variant ?? 0));
  const weak = ctx.weakSubs ?? EMPTY;
  const avoid = ctx.avoid ?? EMPTY;
  const picks: { id: string; reason: string }[] = [];
  const has = (id: string) => picks.some((p) => p.id === id);

  // 1) 필수 동작
  for (const pattern of movementPatternsFor(focus, gender)) {
    if (picks.length >= count) break;
    const order = beginner ? (pattern.beginner ?? pattern.ids) : pattern.ids;
    let cands = arrangeCandidates(order, gym, avoid).filter((id) => !has(id));
    if (beginner && picks.length === 0) {
      const safe = cands.filter((id) => !BEGINNER_FIRST_SLOT_AVOID.has(id));
      if (safe.length > 0) cands = safe;
    }
    if (cands.length === 0) continue;
    const weakFirst = cands.filter((id) => weakHits(id, weak).length > 0);
    const from = weakFirst.length > 0 ? weakFirst : cands;
    const id = from[variant % from.length];
    // '입문 추천' 은 입문이라서 **다른 운동으로 바꿨을 때만** 붙인다(측면 레이즈처럼 같으면 안 붙임).
    const beginnerNote =
      beginner && pattern.beginner && !pattern.ids.slice(0, 1).includes(id) && pattern.beginner.includes(id)
        ? " · 입문 추천"
        : "";
    picks.push({ id, reason: pattern.label + weakNote(id, weak, pattern.label) + beginnerNote });
  }

  // 2) 세부근육 균형 — 큐레이션(킹 운동) → 세부근육 블록
  const subs =
    (SUB_MUSCLES[focus as keyof typeof SUB_MUSCLES] as { id: string }[] | undefined) ?? [];
  const all: string[] = [];
  const add = (id: string) => {
    if (id && EXERCISES[id] && !all.includes(id)) all.push(id);
  };
  const curated =
    (gender === "female" ? FOCUS_EXERCISES_FEMALE : FOCUS_EXERCISES)[focus] ?? [];
  for (const id of curated) add(id);
  for (const sub of subs) for (const id of MAIN_BLOCK_EXERCISES[sub.id] ?? []) add(id);
  // 🔴 세부근육 균형을 잡기 **전에** 거른다. 뽑고 나서 걸러내면 그 자리가 빈칸으로
  // 남아 추천 개수가 줄고, 남은 자리를 다른 근육이 못 메운다.
  // 전부 걸러지면 원본을 쓴다(빈 추천을 만들지 않는다 — keepDoableIds 와 같은 규칙).
  const pool = arrangeCandidates(keepDoableIds(all, gym), null, avoid);
  const firstOk = (id: string) =>
    !(beginner && picks.length === 0 && BEGINNER_FIRST_SLOT_AVOID.has(id));

  const covered = new Set(picks.flatMap((p) => EXERCISE_SUB_MUSCLES[p.id] ?? []));
  const subOrder = [
    ...subs.filter((sub) => weak.has(sub.id)),
    ...subs.filter((sub) => !weak.has(sub.id)),
  ];
  for (const sub of subOrder) {
    if (picks.length >= count) break;
    if (covered.has(sub.id)) continue;
    const cand = pool.find(
      (id) => !has(id) && firstOk(id) && (EXERCISE_SUB_MUSCLES[id] ?? []).includes(sub.id),
    );
    if (!cand) continue;
    picks.push({
      id: cand,
      reason: (SUB_LABEL[sub.id] ?? sub.id) + (weak.has(sub.id) ? " · 이번 주 0세트" : ""),
    });
    for (const s2 of EXERCISE_SUB_MUSCLES[cand] ?? []) covered.add(s2);
  }

  // 3) 남는 칸은 풀 순서대로(세부 매핑 없는 킹 포함)
  for (const id of pool) {
    if (picks.length >= count) break;
    if (has(id) || !firstOk(id)) continue;
    const sub = (EXERCISE_SUB_MUSCLES[id] ?? [])[0];
    picks.push({ id, reason: sub ? (SUB_LABEL[sub] ?? sub) : EXERCISES[id].target });
  }

  return picks
    .filter((p) => EXERCISES[p.id])
    .slice(0, count)
    .map((p) => ({ exercise: EXERCISES[p.id], reason: p.reason }));
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
  gym: GymEquipmentSet = null,
  ctx: RecommendContext = {},
): CatalogExercise[] {
  const specific = specificBlockIds(blockIds).filter(
    (b) => MAIN_BLOCK_EXERCISES[b],
  );
  // 블록마다 따로 거른다 — 라운드로빈이 블록 간 균형을 잡는 구조라, 합쳐서 거르면
  // 기구가 부족한 블록이 통째로 밀려난다.
  const blockLists = specific.map((b) =>
    keepDoableIds(MAIN_BLOCK_EXERCISES[b], gym),
  );
  if (blockLists.length > 0) {
    const ids: string[] = [];
    // 여러 세부 블록은 한 목록이 슬롯을 독식하지 않게 라운드로빈으로 뽑는다.
    // 이두+삼두라면 이두 2개 + 삼두 2개가 된다.
    const maxLength = Math.max(...blockLists.map((list) => list.length));
    for (let index = 0; index < maxLength; index++) {
      for (const list of blockLists) {
        const id = list[index];
        if (id && !ids.includes(id)) ids.push(id);
        if (ids.length >= MAIN_SLOT_COUNT) break;
      }
      if (ids.length >= MAIN_SLOT_COUNT) break;
    }
    return ids
      .map((id) => EXERCISES[id])
      .filter(Boolean)
      .slice(0, MAIN_SLOT_COUNT);
  }
  // 주 부위는 필수 동작 → 세부 근육 균형으로 4개(보조는 sideExercisesForSlot 에서 2개).
  return recommendFocusPicks(focus, gender, MAIN_SLOT_COUNT, gym, ctx).map(
    (p) => p.exercise,
  );
}

/**
 * `focusExercisesForSlot` 과 같은 선택 + 고른 이유. 편집 화면의 '추천으로 채우기' 가 쓴다.
 * 세부 블록(이두·삼두 등) 슬롯은 그 블록 이름이 이유다.
 */
export function focusPicksForSlot(
  focus: FocusKey,
  blockIds: string[],
  gender: "male" | "female" = "male",
  gym: GymEquipmentSet = null,
  ctx: RecommendContext = {},
): RecommendedPick[] {
  const specific = specificBlockIds(blockIds).filter((b) => MAIN_BLOCK_EXERCISES[b]);
  if (specific.length === 0) {
    return recommendFocusPicks(focus, gender, MAIN_SLOT_COUNT, gym, ctx);
  }
  return focusExercisesForSlot(focus, blockIds, gender, gym, ctx).map((exercise) => {
    const block = specific.find((b) => MAIN_BLOCK_EXERCISES[b].includes(exercise.id));
    const label =
      block === "biceps"
        ? "이두"
        : block === "triceps"
          ? "삼두"
          : (SUB_LABEL[block ?? ""] ?? exercise.target);
    return { exercise, reason: label };
  });
}

/**
 * 2단계 신호 — 최근 기록에서 **자주 건너뛴 운동**을 고른다(순수 함수).
 * 같은 운동을 `min` 번 이상 '건너뛰기' 했으면 추천에서 뒤로 미룬다(빼지는 않는다).
 */
export function frequentlySkippedIds(
  records: readonly { exerciseId: string | null; status: string }[],
  min = 2,
): Set<string> {
  const count = new Map<string, number>();
  for (const r of records) {
    if (r.status !== "skipped" || !r.exerciseId) continue;
    count.set(r.exerciseId, (count.get(r.exerciseId) ?? 0) + 1);
  }
  return new Set([...count].filter(([, n]) => n >= min).map(([id]) => id));
}

/**
 * 2단계 신호 — 이번 주 0세트 세부근육. 이번 주에 **아무것도 안 했으면** 비운다
 * (전부 0세트라 '부족' 이 아니라 '아직 시작 전' 이다 — 순서를 흔들 이유가 없다).
 */
export function weakSubsFromWeek(
  view: { weekSets: number; untouchedSubs: readonly { id: string }[] } | null,
): Set<string> {
  if (!view || view.weekSets <= 0) return new Set();
  return new Set(view.untouchedSubs.map((s) => s.id));
}
