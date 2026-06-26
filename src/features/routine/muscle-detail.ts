/**
 * 세부 근육(sub-muscle) 데이터 레이어 — 순수 모듈.
 *
 * 부위(MuscleId)를 더 잘게 나눈 "세부 근육"을 정의하고, 각 운동이 그 안에서
 * 어떤 세부 근육에 특화돼 있는지 매핑한다.
 * 예) 이두 = 장두 / 단두 / 상완근, 삼두 = 장두 / 외측두 / 내측두.
 *     인클라인 컬 → 이두 장두, 컨센트레이션 컬 → 이두 단두.
 *
 * 매핑은 카탈로그의 target 문자열(이미 "이두(장두)", "상부 대흉근" 등으로
 * 세부를 표기)과 일반적인 해부학 지식을 근거로 큐레이션했다.
 * 명시 매핑이 없는 운동은 그 부위의 대표 세부 근육 전체로 폴백한다.
 *
 * three.js 같은 렌더링 코드는 여기 들어오지 않는다(순수·테스트 가능 유지).
 */

import {
  ALL_EXERCISES,
  groupedByBodyPart,
} from "@/features/routine/exercise-catalog";
import {
  muscleGroup,
  type BodySide,
  type MuscleId,
} from "@/features/routine/muscle-map";

export type SubMuscle = {
  /** 전역 유일 id — `${muscleId}-${slug}` */
  id: string;
  /** 상위 부위 */
  muscle: MuscleId;
  /** 한국어 라벨 */
  label: string;
  /** 앞/뒤/양면 — 마네킹 카메라·범례용 */
  side: BodySide;
};

/**
 * 부위별 세부 근육 정의(표시 순서대로).
 * 색은 상위 부위 색을 공유하므로 여기엔 없다.
 */
export const SUB_MUSCLES: Record<MuscleId, SubMuscle[]> = {
  chest: [
    { id: "chest-upper", muscle: "chest", label: "상부 대흉근", side: "front" },
    { id: "chest-mid", muscle: "chest", label: "중부 대흉근", side: "front" },
    { id: "chest-lower", muscle: "chest", label: "하부 대흉근", side: "front" },
    { id: "chest-inner", muscle: "chest", label: "내측 대흉근", side: "front" },
  ],
  back: [
    { id: "back-lats", muscle: "back", label: "광배근", side: "back" },
    { id: "back-traps", muscle: "back", label: "승모근", side: "back" },
    { id: "back-rhomboids", muscle: "back", label: "능형근", side: "back" },
    { id: "back-erector", muscle: "back", label: "척추기립근", side: "back" },
  ],
  shoulder: [
    { id: "shoulder-front", muscle: "shoulder", label: "전면 삼각근", side: "front" },
    { id: "shoulder-side", muscle: "shoulder", label: "측면 삼각근", side: "both" },
    { id: "shoulder-rear", muscle: "shoulder", label: "후면 삼각근", side: "back" },
  ],
  arm: [
    { id: "arm-biceps-long", muscle: "arm", label: "이두 장두", side: "front" },
    { id: "arm-biceps-short", muscle: "arm", label: "이두 단두", side: "front" },
    { id: "arm-triceps-long", muscle: "arm", label: "삼두 장두", side: "back" },
    { id: "arm-triceps-lateral", muscle: "arm", label: "삼두 외측두", side: "back" },
    { id: "arm-triceps-medial", muscle: "arm", label: "삼두 내측두", side: "back" },
    { id: "arm-forearm", muscle: "arm", label: "전완", side: "both" },
  ],
  lower: [
    { id: "lower-quads", muscle: "lower", label: "대퇴사두", side: "front" },
    { id: "lower-hamstrings", muscle: "lower", label: "햄스트링", side: "back" },
    { id: "lower-glutes", muscle: "lower", label: "둔근", side: "back" },
    { id: "lower-adductors", muscle: "lower", label: "내전근", side: "front" },
    { id: "lower-calves", muscle: "lower", label: "종아리", side: "back" },
  ],
  core: [
    { id: "core-upper-abs", muscle: "core", label: "상복부", side: "front" },
    { id: "core-lower-abs", muscle: "core", label: "하복부", side: "front" },
    { id: "core-obliques", muscle: "core", label: "복사근", side: "front" },
  ],
};

/** 부위별 "기본 세부 근육" — 매핑 없는 운동의 폴백(그 부위 대표 갈래들). */
const DEFAULT_SUB: Record<MuscleId, string[]> = {
  chest: ["chest-mid", "chest-upper", "chest-lower"],
  back: ["back-lats", "back-rhomboids"],
  shoulder: ["shoulder-front", "shoulder-side"],
  arm: ["arm-biceps-long", "arm-biceps-short"],
  lower: ["lower-quads", "lower-glutes"],
  core: ["core-upper-abs", "core-lower-abs"],
};

/**
 * 운동 id → 특화 세부 근육 id 목록.
 * (없으면 DEFAULT_SUB 로 폴백 — subMusclesForExercise 참고)
 */
export const EXERCISE_SUB_MUSCLES: Record<string, string[]> = {
  /* ── 가슴 ── */
  "bench-press": ["chest-mid", "chest-lower"],
  "incline-press": ["chest-upper"],
  "incline-cable-fly": ["chest-upper"],
  "decline-press": ["chest-lower"],
  "chest-fly": ["chest-inner", "chest-mid"],
  "pec-deck": ["chest-inner", "chest-mid"],
  "cable-crossover": ["chest-inner", "chest-lower"],
  "cable-fly": ["chest-inner", "chest-mid"],
  dips: ["chest-lower"],
  "push-up": ["chest-mid"],
  "close-grip-bench-press": ["chest-inner"],
  "smith-bench-press": ["chest-mid"],
  "machine-chest-press": ["chest-mid"],
  "dumbbell-pullover": ["chest-lower", "back-lats"],

  /* ── 등 ── */
  deadlift: ["back-erector", "back-lats"],
  "barbell-row": ["back-lats", "back-rhomboids"],
  "pendlay-row": ["back-lats", "back-rhomboids"],
  "t-bar-row": ["back-lats", "back-rhomboids"],
  "meadows-row": ["back-lats"],
  "seated-cable-row": ["back-rhomboids", "back-lats"],
  "low-row-machine": ["back-lats", "back-rhomboids"],
  "chest-supported-row": ["back-rhomboids", "back-lats"],
  "assisted-pull-up": ["back-lats"],
  "one-arm-dumbbell-row": ["back-lats"],
  "lat-pulldown": ["back-lats"],
  "wide-grip-pull-up": ["back-lats"],
  "pull-up": ["back-lats"],
  "chin-up": ["back-lats"],
  "inverted-row": ["back-rhomboids", "back-lats"],
  "straight-arm-pulldown": ["back-lats"],
  shrug: ["back-traps"],
  hyperextension: ["back-erector"],
  "reverse-pec-deck": ["shoulder-rear", "back-rhomboids"],

  /* ── 어깨 ── */
  ohp: ["shoulder-front", "shoulder-side"],
  "machine-shoulder-press": ["shoulder-front", "shoulder-side"],
  "arnold-press": ["shoulder-front", "shoulder-side"],
  "front-raise": ["shoulder-front"],
  "lateral-raise": ["shoulder-side"],
  "cable-lateral-raise": ["shoulder-side"],
  "upright-row": ["shoulder-side", "back-traps"],
  "rear-delt-fly": ["shoulder-rear"],
  "machine-rear-delt-fly": ["shoulder-rear"],
  "cable-rear-delt-fly": ["shoulder-rear"],
  "cable-front-raise": ["shoulder-front"],
  "face-pull": ["shoulder-rear", "back-traps"],

  /* ── 팔 (이두/삼두/전완 세분화) ── */
  "biceps-curl": ["arm-biceps-long", "arm-biceps-short"],
  "cable-curl": ["arm-biceps-long", "arm-biceps-short"],
  "standing-cable-curl": ["arm-biceps-long", "arm-biceps-short"],
  "ez-bar-curl": ["arm-biceps-long", "arm-biceps-short"],
  "incline-curl": ["arm-biceps-long"],
  "drag-curl": ["arm-biceps-long"],
  "concentration-curl": ["arm-biceps-short"],
  "preacher-curl": ["arm-biceps-short"],
  "hammer-curl": ["arm-forearm", "arm-biceps-long"],
  "cable-rope-hammer-curl": ["arm-forearm", "arm-biceps-long"],
  "reverse-curl": ["arm-forearm"],
  "wrist-curl": ["arm-forearm"],
  "zottman-curl": ["arm-forearm", "arm-biceps-short"],
  "triceps-pushdown": ["arm-triceps-lateral", "arm-triceps-medial"],
  "skull-crusher": ["arm-triceps-long"],
  "overhead-triceps-extension": ["arm-triceps-long"],
  "triceps-kickback": ["arm-triceps-lateral"],
  "bench-dip": ["arm-triceps-medial", "arm-triceps-long"],
  "diamond-pushup": ["arm-triceps-medial", "arm-triceps-lateral"],

  /* ── 하체 ── */
  squat: ["lower-quads", "lower-glutes"],
  "front-squat": ["lower-quads"],
  "smith-squat": ["lower-quads", "lower-glutes"],
  "box-squat": ["lower-quads", "lower-glutes"],
  "belt-squat": ["lower-quads", "lower-glutes"],
  "goblet-squat": ["lower-quads", "lower-glutes"],
  "hack-squat": ["lower-quads"],
  "sissy-squat": ["lower-quads"],
  "leg-extension": ["lower-quads"],
  "leg-press": ["lower-quads", "lower-glutes"],
  "single-leg-leg-press": ["lower-quads", "lower-glutes"],
  lunge: ["lower-quads", "lower-glutes"],
  "walking-lunge": ["lower-quads", "lower-glutes"],
  "bulgarian-split-squat": ["lower-quads", "lower-glutes"],
  "step-up": ["lower-quads", "lower-glutes"],
  "pistol-squat": ["lower-quads", "lower-glutes"],
  rdl: ["lower-hamstrings", "lower-glutes"],
  "stiff-leg-deadlift": ["lower-hamstrings", "lower-glutes"],
  "sumo-deadlift": ["lower-glutes", "lower-adductors", "lower-hamstrings"],
  "good-morning": ["lower-hamstrings", "back-erector"],
  "leg-curl": ["lower-hamstrings"],
  "seated-leg-curl": ["lower-hamstrings"],
  "hip-thrust": ["lower-glutes"],
  "cable-pull-through": ["lower-glutes", "lower-hamstrings"],
  "glute-bridge": ["lower-glutes"],
  "cable-kickback": ["lower-glutes"],
  "hip-abduction": ["lower-glutes"],
  "curtsy-lunge": ["lower-glutes", "lower-quads"],
  "hip-adduction": ["lower-adductors"],
  "sumo-squat": ["lower-adductors", "lower-glutes", "lower-quads"],
  "cossack-squat": ["lower-adductors", "lower-quads"],
  "standing-calf-raise": ["lower-calves"],
  "seated-calf-raise": ["lower-calves"],
  "donkey-calf-raise": ["lower-calves"],

  /* ── 코어 ── */
  plank: ["core-upper-abs", "core-lower-abs"],
  "hollow-hold": ["core-upper-abs", "core-lower-abs"],
  "ab-rollout": ["core-upper-abs", "core-lower-abs"],
  "v-up": ["core-upper-abs", "core-lower-abs"],
  crunch: ["core-upper-abs"],
  "sit-up": ["core-upper-abs"],
  "cable-crunch": ["core-upper-abs"],
  "hanging-leg-raise": ["core-lower-abs"],
  "reverse-crunch": ["core-lower-abs"],
  "toes-to-bar": ["core-lower-abs"],
  "mountain-climber": ["core-lower-abs"],
  "side-plank": ["core-obliques"],
  "russian-twist": ["core-obliques"],
  "bicycle-crunch": ["core-obliques", "core-upper-abs"],
  "wood-chopper": ["core-obliques"],
  "pallof-press": ["core-obliques"],
};

/** 모든 세부 근육 (표시 순서) — 부위 순서대로 펼침. */
export const ALL_SUB_MUSCLES: SubMuscle[] = (
  Object.keys(SUB_MUSCLES) as MuscleId[]
).flatMap((m) => SUB_MUSCLES[m]);

const SUB_BY_ID: Record<string, SubMuscle> = Object.fromEntries(
  ALL_SUB_MUSCLES.map((s) => [s.id, s]),
);

/** 세부 근육 id 유효성 */
export function isSubMuscleId(value: unknown): value is string {
  return typeof value === "string" && value in SUB_BY_ID;
}

/** id → 세부 근육 정의 */
export function subMuscle(id: string): SubMuscle | undefined {
  return SUB_BY_ID[id];
}

/** 부위 → 세부 근육 목록 */
export function subMusclesFor(muscle: MuscleId): SubMuscle[] {
  return SUB_MUSCLES[muscle];
}

/**
 * 운동 → 특화 세부 근육 목록.
 * 명시 매핑이 있으면 그것을, 없으면 그 운동 1차 부위의 기본 세부 근육으로 폴백.
 */
export function subMusclesForExercise(exerciseId: string): SubMuscle[] {
  const explicit = EXERCISE_SUB_MUSCLES[exerciseId];
  if (explicit) {
    return explicit.map((id) => SUB_BY_ID[id]).filter(Boolean);
  }
  // 폴백: 1차 부위 찾기
  const grouped = groupedByBodyPart();
  for (const muscle of Object.keys(grouped) as MuscleId[]) {
    if (grouped[muscle].some((e) => e.id === exerciseId)) {
      return DEFAULT_SUB[muscle].map((id) => SUB_BY_ID[id]).filter(Boolean);
    }
  }
  return [];
}

/** 세부 근육 → 그 근육에 특화된(또는 폴백으로 걸린) 운동 id 목록. */
export function exerciseIdsForSubMuscle(subId: string): string[] {
  const ids: string[] = [];
  for (const ex of ALL_EXERCISES) {
    if (subMusclesForExercise(ex.id).some((s) => s.id === subId)) {
      ids.push(ex.id);
    }
  }
  return ids;
}

/** 세부 근육 라벨 도우미 (상위 부위 색을 함께 제공) */
export function subMuscleColor(id: string): string {
  const s = SUB_BY_ID[id];
  return s ? muscleGroup(s.muscle).color : "#a1a1aa";
}