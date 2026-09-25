/**
 * 부위별 **필수 동작 패턴** — 추천이 세부근육 균형보다 먼저 채우는 칸.
 *
 * 2026-09-25 루틴 추천 고도화 1단계(docs/routine-recommend-review-2026-09-25.html).
 * 세부근육(광배·승모·능형·기립근)에 한 칸씩 공평하게 나누던 예전 규칙은 동작을 몰라서
 * 남자 등 추천에 랫풀다운·풀업(수직 당기기)이 빠지고 슈러그·하이퍼익스텐션이 들어갔다.
 * 여기서 "이 부위라면 꼭 있어야 할 동작"을 먼저 정하고, 남는 칸만 세부근육 균형으로 채운다.
 *
 * - `ids`      : 중급·고급 기본 순서(앞이 우선).
 * - `beginner` : 입문 순서 — 머신·안정적인 변형을 앞에 둔다. 없으면 `ids`.
 * - 같은 패턴 안에서 A/B 변형은 순서상 다음 후보를 쓴다(recommend.ts).
 *
 * 순수 데이터 모듈 — 카탈로그를 import 하지 않는다(id 문자열만). 없는 id 는 추천 단계에서 걸러진다.
 */

import type { FocusKey } from "@/features/routine/exercise-catalog";

export type MovementPattern = {
  id: string;
  /** 추천 이유로 보여 줄 짧은 이름 */
  label: string;
  ids: readonly string[];
  beginner?: readonly string[];
};

const P = {
  horizontalPress: {
    id: "horizontal-press",
    label: "밀기 · 가슴 프레스",
    ids: ["bench-press", "machine-chest-press", "smith-bench-press", "push-up"],
    beginner: ["machine-chest-press", "push-up", "smith-bench-press", "bench-press"],
  },
  upperChest: {
    id: "upper-chest",
    label: "윗가슴",
    ids: ["incline-press", "incline-cable-fly"],
    beginner: ["incline-cable-fly", "incline-press"],
  },
  chestFly: {
    id: "chest-fly",
    label: "가슴 모으기",
    ids: ["chest-fly", "cable-fly", "pec-deck", "cable-crossover"],
    beginner: ["pec-deck", "cable-fly", "chest-fly"],
  },
  verticalPull: {
    id: "vertical-pull",
    label: "수직 당기기",
    ids: ["pull-up", "lat-pulldown", "chin-up", "wide-grip-pull-up"],
    beginner: ["lat-pulldown", "assisted-pull-up"],
  },
  /** 여성 기본 — 중급도 랫풀다운을 먼저(예전 여성 큐레이션 순서). 풀업은 A/B 로 들어온다. */
  verticalPullF: {
    id: "vertical-pull",
    label: "수직 당기기",
    ids: ["lat-pulldown", "pull-up", "assisted-pull-up", "chin-up"],
    beginner: ["lat-pulldown", "assisted-pull-up"],
  },
  horizontalPull: {
    id: "horizontal-pull",
    label: "수평 당기기",
    ids: ["barbell-row", "seated-cable-row", "t-bar-row", "one-arm-dumbbell-row"],
    beginner: ["seated-cable-row", "chest-supported-row", "low-row-machine"],
  },
  hinge: {
    id: "hinge",
    label: "엉덩이 접기 · 후면 사슬",
    ids: ["deadlift", "rdl", "hyperextension"],
    beginner: ["hyperextension", "cable-pull-through", "rdl"],
  },
  rearDelt: {
    id: "rear-delt",
    label: "후면 어깨 · 능형",
    ids: ["face-pull", "rear-delt-fly", "reverse-pec-deck"],
    beginner: ["reverse-pec-deck", "face-pull", "machine-rear-delt-fly"],
  },
  verticalPress: {
    id: "vertical-press",
    label: "머리 위로 밀기",
    ids: ["ohp", "arnold-press", "machine-shoulder-press"],
    beginner: ["machine-shoulder-press", "arnold-press", "ohp"],
  },
  sideDelt: {
    id: "side-delt",
    label: "측면 어깨",
    ids: ["lateral-raise", "cable-lateral-raise"],
  },
  kneeDominant: {
    id: "knee-dominant",
    label: "무릎 주도 · 앞허벅지",
    ids: ["squat", "hack-squat", "leg-press", "front-squat"],
    beginner: ["leg-press", "goblet-squat", "smith-squat", "squat"],
  },
  hipDominant: {
    id: "hip-dominant",
    label: "엉덩이 주도 · 뒤허벅지",
    ids: ["rdl", "hip-thrust", "stiff-leg-deadlift"],
    beginner: ["hip-thrust", "glute-bridge", "cable-pull-through", "rdl"],
  },
  gluteBridge: {
    id: "glute",
    label: "둔근",
    ids: ["hip-thrust", "glute-bridge", "cable-kickback"],
    beginner: ["hip-thrust", "glute-bridge", "cable-kickback"],
  },
  hamstringCurl: {
    id: "hamstring-curl",
    label: "뒤허벅지 굽히기",
    ids: ["leg-curl", "seated-leg-curl"],
  },
  singleLeg: {
    id: "single-leg",
    label: "한 다리",
    ids: ["bulgarian-split-squat", "walking-lunge", "lunge", "step-up"],
    beginner: ["step-up", "lunge", "bulgarian-split-squat"],
  },
  quadIsoOrCalf: {
    id: "quad-iso-calf",
    label: "앞허벅지 고립 · 종아리",
    ids: ["leg-extension", "standing-calf-raise", "seated-calf-raise"],
  },
  biceps: {
    id: "biceps",
    label: "이두",
    ids: ["biceps-curl", "ez-bar-curl", "cable-curl"],
    beginner: ["cable-curl", "biceps-curl"],
  },
  biceps2: {
    id: "biceps-2",
    label: "이두 · 팔뚝",
    ids: ["hammer-curl", "preacher-curl", "incline-curl"],
    beginner: ["hammer-curl", "preacher-curl"],
  },
  triceps: {
    id: "triceps",
    label: "삼두",
    ids: ["triceps-pushdown", "skull-crusher", "close-grip-bench-press"],
    beginner: ["triceps-pushdown"],
  },
  triceps2: {
    id: "triceps-2",
    label: "삼두 장두",
    ids: ["overhead-triceps-extension", "skull-crusher", "triceps-kickback"],
    beginner: ["overhead-triceps-extension", "triceps-kickback"],
  },
  dipsOrFly: {
    id: "dips-fly",
    label: "아랫가슴 · 모으기",
    ids: ["dips", "chest-fly", "cable-crossover"],
    beginner: ["pec-deck", "cable-crossover", "dips"],
  },
} satisfies Record<string, MovementPattern>;

/**
 * 부위별 필수 동작(앞에서부터 한 칸씩). 없는 부위(core 등)는 예전 세부근육 균형 그대로.
 * 칸 수(MAIN_SLOT_COUNT=4)보다 적으면 남는 칸은 세부근육 균형으로 채운다.
 */
const MALE: Partial<Record<FocusKey, readonly MovementPattern[]>> = {
  chest: [P.horizontalPress, P.upperChest, P.chestFly],
  back: [P.verticalPull, P.horizontalPull, P.hinge, P.rearDelt],
  shoulder: [P.verticalPress, P.sideDelt, P.rearDelt],
  arm: [P.biceps, P.triceps, P.biceps2, P.triceps2],
  lower: [P.kneeDominant, P.hipDominant, P.hamstringCurl, P.quadIsoOrCalf],
  fullbody: [P.kneeDominant, P.horizontalPress, P.horizontalPull, P.verticalPress],
  upper: [P.horizontalPress, P.verticalPull, P.horizontalPull, P.verticalPress],
  push: [P.horizontalPress, P.verticalPress, P.dipsOrFly, P.triceps],
  pull: [P.verticalPull, P.horizontalPull, P.hinge, P.biceps],
};

/** 여성 기본 — 하체·전신은 둔근을 앞에 둔다(예전 여성 큐레이션과 같은 방향). */
const FEMALE: Partial<Record<FocusKey, readonly MovementPattern[]>> = {
  ...MALE,
  back: [P.verticalPullF, P.horizontalPull, P.hinge, P.rearDelt],
  upper: [P.horizontalPress, P.verticalPullF, P.horizontalPull, P.verticalPress],
  pull: [P.verticalPullF, P.horizontalPull, P.hinge, P.biceps],
  lower: [P.gluteBridge, P.kneeDominant, P.hamstringCurl, P.singleLeg],
  fullbody: [P.kneeDominant, P.gluteBridge, P.horizontalPull, P.verticalPress],
};

export function movementPatternsFor(
  focus: FocusKey,
  gender: "male" | "female",
): readonly MovementPattern[] {
  return (gender === "female" ? FEMALE : MALE)[focus] ?? [];
}

/**
 * 입문자 추천의 **첫 칸**에 두지 않을 고위험·고기술 운동(사용자 결정 2026-09-25: 첫 칸에서만 뺀다).
 * 입문 순서(`beginner`)가 이미 머신을 앞에 두지만, 헬스장 기구로 걸러져 이게 첫 칸으로
 * 올라오는 경우를 막는다.
 */
export const BEGINNER_FIRST_SLOT_AVOID: ReadonlySet<string> = new Set([
  "deadlift",
  "squat",
  "front-squat",
  "bench-press",
  "ohp",
  "barbell-row",
  "pendlay-row",
  "sumo-deadlift",
  "good-morning",
  "stiff-leg-deadlift",
  "box-squat",
]);
