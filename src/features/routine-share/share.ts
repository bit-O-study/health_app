/**
 * 루틴 소개(하루치 루틴 공유) — 순수 모듈(server-only 없음 → 단위 테스트 가능).
 *
 * 내 루틴의 '한 일차'(예: 1일차 등)를 운동 순서·메모까지 **복사(스냅샷)** 해 공개하고,
 * 다른 사람이 자기 루틴의 한 일차로 담아간다. 스냅샷 모양은 `routine_presets` 와 같은
 * snake_case DB 행 형태 — 담을 때 그대로 다시 insert 할 수 있다.
 *
 * 설계: docs/design/routine-share.md
 */

/** routine_exercises 행 스냅샷. day_index 는 담는 쪽에서 정하므로 담지 않는다. */
export type ShareExercise = {
  focus: string;
  position: number;
  exercise_id: string;
  equipment: string;
  sets: number;
  reps: number;
  weight_kg: number | null;
  memo: string | null;
};

/** routine_conditioning 행 스냅샷. */
export type ShareConditioning = {
  focus: string;
  kind: string;
  position: number;
  item_id: string;
  duration_min: number | null;
  speed: number | null;
  incline: number | null;
  sets: number | null;
  reps: number | null;
  memo: string | null;
};

export type ShareVisibility = "public" | "group" | "public_except_group";

/**
 * 피드 카드 1장 = 상세까지 통째로. 카드가 30장 남짓이고 한 장에 운동 5~8개라,
 * 상세를 따로 왕복해 읽는 것보다 한 번에 내리는 편이 훨씬 빠르다(탭 전환이 즉시).
 * (클라이언트 컴포넌트도 쓰는 타입이라 server-only 모듈이 아닌 여기 둔다.)
 */
export type RoutineShareItem = {
  id: string;
  userId: string;
  title: string;
  caption: string | null;
  authorName: string;
  focusBlocks: string[];
  focusNames: string[];
  exerciseCount: number;
  /** "랫풀다운 → 시티드로우 → 데드리프트 …" */
  preview: string;
  includeWeight: boolean;
  saveCount: number;
  likeCount: number;
  likedByMe: boolean;
  mine: boolean;
  createdAt: string;
  exercises: (ShareExercise & { name: string })[];
  conditioning: (ShareConditioning & { name: string })[];
};

/** '내 루틴에 담기' 시트의 한 줄(= 내 루틴의 한 일차). */
export type ApplyTarget = {
  dayIndex: number;
  /** 그 일차의 첫 부위 — 워밍업/마무리를 이 부위로 담는다(컨디셔닝은 부위 단위). */
  focus: string;
  /** "1일차 · 등" */
  label: string;
  exerciseCount: number;
};

export const MAX_TITLE = 60;
export const MAX_CAPTION = 200;

/** 제목·한마디 검증. 문제가 없으면 null. */
export function validateShareText(
  title: string,
  caption: string,
): string | null {
  const t = title.trim();
  if (t === "") return "제목을 입력하세요.";
  if (t.length > MAX_TITLE) return `제목은 ${MAX_TITLE}자까지예요.`;
  if (caption.trim().length > MAX_CAPTION)
    return `한마디는 ${MAX_CAPTION}자까지예요.`;
  return null;
}

/**
 * 무게를 뺀 스냅샷. 기본값은 '무게 제외' —
 * 남의 100kg 스쿼트가 그대로 내 루틴에 들어오면 위험하고, 어차피 첫 세트에서 고칠 값이다.
 * 순서·세트·횟수·메모만 있어도 루틴은 재현된다.
 */
export function applyWeightPolicy(
  rows: ShareExercise[],
  includeWeight: boolean,
): ShareExercise[] {
  return includeWeight ? rows : rows.map((r) => ({ ...r, weight_kg: null }));
}

/**
 * 담을 때 넣을 routine_exercises 행. 대상 일차(dayIndex)를 붙이고 position 을
 * 0부터 다시 매긴다(부위별로 독립). 무게는 스냅샷 값 그대로 — 스냅샷을 만들 때 이미
 * 정책이 적용돼 있다.
 */
export function toRoutineRows(
  snapshot: ShareExercise[],
  userId: string,
  dayIndex: number,
): Record<string, unknown>[] {
  const nextPos = new Map<string, number>();
  return [...snapshot]
    .sort((a, b) => a.position - b.position)
    .map((e) => {
      const p = nextPos.get(e.focus) ?? 0;
      nextPos.set(e.focus, p + 1);
      return {
        user_id: userId,
        day_index: dayIndex,
        focus: e.focus,
        position: p,
        exercise_id: e.exercise_id,
        equipment: e.equipment,
        sets: e.sets,
        reps: e.reps,
        weight_kg: e.weight_kg ?? null,
        set_details: null,
        memo: e.memo ?? null,
      };
    });
}

/**
 * 워밍업/마무리는 **부위 단위**(routine_conditioning 엔 day_index 가 없다). 그래서
 * 담을 때는 대상 일차의 부위로 focus 를 갈아끼운다 — 원본 부위를 그대로 쓰면 내 루틴에
 * 없는 부위의 워밍업이 생겨 아무 데도 안 보인다.
 */
export function toConditioningRows(
  snapshot: ShareConditioning[],
  userId: string,
  targetFocus: string,
): Record<string, unknown>[] {
  const nextPos = new Map<string, number>();
  return [...snapshot]
    .sort((a, b) => a.position - b.position)
    .map((c) => {
      const p = nextPos.get(c.kind) ?? 0;
      nextPos.set(c.kind, p + 1);
      return {
        user_id: userId,
        focus: targetFocus,
        kind: c.kind === "cooldown" ? "cooldown" : "warmup",
        position: p,
        item_id: c.item_id,
        duration_min: c.duration_min ?? null,
        speed: c.speed ?? null,
        incline: c.incline ?? null,
        sets: c.sets ?? null,
        reps: c.reps ?? null,
        memo: c.memo ?? null,
      };
    });
}

/**
 * 카드 한 줄 미리보기 — 운동 이름을 최대 `max` 개까지 " → " 로 잇고, 더 있으면 "…".
 * 목록에서 "어떤 루틴인지" 가 바로 읽히게 하려는 것.
 */
export function previewLine(names: string[], max = 3): string {
  if (names.length === 0) return "운동 없음";
  const head = names.slice(0, max).join(" → ");
  return names.length > max ? `${head} …` : head;
}

/**
 * 담기 시트에 쓸 일차 줄 설명. 비어 있으면 바로 담고, 차 있으면 덮어쓰기 확인을 받는다.
 */
export function applyTargetNote(exerciseCount: number): {
  note: string;
  overwrites: boolean;
} {
  return exerciseCount > 0
    ? { note: `운동 ${exerciseCount}개 — 덮어씁니다`, overwrites: true }
    : { note: "그대로 채워집니다", overwrites: false };
}

/** 비어 있는 일차를 위로. 같은 그룹 안에서는 일차 순서 유지. */
export function sortApplyTargets<T extends { exerciseCount: number; dayIndex: number }>(
  targets: T[],
): T[] {
  return [...targets].sort((a, b) => {
    const ea = a.exerciseCount === 0 ? 0 : 1;
    const eb = b.exerciseCount === 0 ? 0 : 1;
    return ea !== eb ? ea - eb : a.dayIndex - b.dayIndex;
  });
}
