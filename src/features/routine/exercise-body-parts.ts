/**
 * 운동 → 신체 부위 매핑과 표시용 배지.
 *
 * 부위 배지·근육별 그룹핑에서 쓴다. **운동 목록 데이터와 분리해 둔다** —
 * 배지 하나 달자고 1,237개 목록(274 KiB)을 클라이언트로 끌고 오면 안 된다.
 * (`exercise-catalog.ts` 가 재수출하므로 기존 import 경로는 그대로 동작한다.)
 */

import {
  BODY_PART_LABEL,
  BODY_PART_ORDER,
  BODY_PART_TONE,
  FULLBODY_TONE,
  type BodyPart,
} from "@/features/routine/exercise-catalog-labels";
import { EXTRA_BODY_PART } from "@/features/routine/exercise-catalog-extra-maps";

const PRIMARY_BODY_PART: Record<string, BodyPart> = {
  // 가슴
  "bench-press": "chest",
  "incline-press": "chest",
  "decline-press": "chest",
  "chest-fly": "chest",
  "pec-deck": "chest",
  "cable-crossover": "chest",
  "push-up": "chest",
  dips: "chest",
  "close-grip-bench-press": "chest",
  // 등
  deadlift: "back",
  "barbell-row": "back",
  "t-bar-row": "back",
  "seated-cable-row": "back",
  "one-arm-dumbbell-row": "back",
  "lat-pulldown": "back",
  "pull-up": "back",
  "chin-up": "back",
  "straight-arm-pulldown": "back",
  shrug: "back",
  hyperextension: "back",
  // 어깨
  ohp: "shoulder",
  "lateral-raise": "shoulder",
  "face-pull": "shoulder",
  "arnold-press": "shoulder",
  "front-raise": "shoulder",
  "rear-delt-fly": "shoulder",
  "upright-row": "shoulder",
  // 팔
  "biceps-curl": "arm",
  "hammer-curl": "arm",
  "triceps-pushdown": "arm",
  "preacher-curl": "arm",
  "ez-bar-curl": "arm",
  "incline-curl": "arm",
  "concentration-curl": "arm",
  "skull-crusher": "arm",
  "overhead-triceps-extension": "arm",
  "bench-dip": "arm",
  "reverse-curl": "arm",
  "wrist-curl": "arm",
  // 하체
  squat: "lower",
  "leg-press": "lower",
  rdl: "lower",
  "leg-curl": "lower",
  "hip-thrust": "lower",
  "glute-bridge": "lower",
  lunge: "lower",
  "bulgarian-split-squat": "lower",
  "cable-kickback": "lower",
  "hip-abduction": "lower",
  "front-squat": "lower",
  "goblet-squat": "lower",
  "hack-squat": "lower",
  "leg-extension": "lower",
  "seated-leg-curl": "lower",
  "standing-calf-raise": "lower",
  "seated-calf-raise": "lower",
  "sumo-deadlift": "lower",
  "good-morning": "lower",
  "step-up": "lower",
  "hip-adduction": "lower",
  "walking-lunge": "lower",
  "smith-squat": "lower",
  // 코어
  plank: "core",
  "hanging-leg-raise": "core",
  "cable-crunch": "core",
  "sit-up": "core",
  crunch: "core",
  "side-plank": "core",
  "russian-twist": "core",
  "ab-rollout": "core",
  "mountain-climber": "core",
  "wood-chopper": "core",
  "pallof-press": "core",
  // ── 2차 추가 매핑
  "smith-bench-press": "chest",
  "machine-chest-press": "chest",
  "incline-cable-fly": "chest",
  "dumbbell-pullover": "chest",
  "pendlay-row": "back",
  "meadows-row": "back",
  "reverse-pec-deck": "back",
  "inverted-row": "back",
  "wide-grip-pull-up": "back",
  "cable-lateral-raise": "shoulder",
  "machine-shoulder-press": "shoulder",
  "machine-rear-delt-fly": "shoulder",
  "cable-rear-delt-fly": "shoulder",
  "cable-front-raise": "shoulder",
  "cable-fly": "chest",
  "cable-curl": "arm",
  "drag-curl": "arm",
  "zottman-curl": "arm",
  "cable-rope-hammer-curl": "arm",
  "triceps-kickback": "arm",
  "diamond-pushup": "arm",
  "stiff-leg-deadlift": "lower",
  "pistol-squat": "lower",
  "sissy-squat": "lower",
  "cossack-squat": "lower",
  "box-squat": "lower",
  "belt-squat": "lower",
  "single-leg-leg-press": "lower",
  "curtsy-lunge": "lower",
  "sumo-squat": "lower",
  "donkey-calf-raise": "lower",
  "reverse-crunch": "core",
  "v-up": "core",
  "hollow-hold": "core",
  "toes-to-bar": "core",
  "bicycle-crunch": "core",
  // ── 3차 추가
  "low-row-machine": "back",
  "chest-supported-row": "back",
  "assisted-pull-up": "back",
  "standing-cable-curl": "arm",
  "cable-pull-through": "lower",
};

export function primaryBodyPart(id: string): BodyPart {
  return PRIMARY_BODY_PART[id] ?? EXTRA_BODY_PART[id] ?? "core";
}

/**
 * 운동 id → 대표 부위(focus). **목록 데이터 없이** 매핑만으로 답한다.
 *
 * `exercise-catalog.focusForExercise()` 와 결과가 같다 — 그쪽은 부위별 운동 목록을
 * 역인덱싱하는데, 그 목록이 `primaryBodyPart()` 로 만들어지므로 결국 같은 값이다
 * (합성 focus 인 fullbody/upper/push/pull 보다 기본 6부위를 먼저 매칭하기 때문).
 * 두 함수가 어긋나지 않는지는 `exercise-focus-map.test.ts` 가 전 종목으로 못 박는다.
 *
 * 매핑에 없는 id 는 `null` — `primaryBodyPart()` 의 "core" 폴백과 다르다.
 * 카탈로그에 없는 운동에 부위 칩을 달면 안 되기 때문(카탈로그 쪽도 null 을 준다).
 */
export function focusForExerciseId(id: string): BodyPart | null {
  return PRIMARY_BODY_PART[id] ?? EXTRA_BODY_PART[id] ?? null;
}

/**
 * 보조 부위 — 한 운동이 여러 부위를 자극할 때(복합 운동) 추가로 다는 태그.
 * 예: 플랭크=코어+하체, 데드리프트=등+하체, 스쿼트=하체+코어.
 * primary 외에 함께 표시할 부위만 적는다. (조정하려면 여기만 고치면 됨)
 */
const EXTRA_BODY_PARTS: Record<string, BodyPart[]> = {
  // 코어 + 하체
  plank: ["lower"],
  "side-plank": ["lower"],
  "mountain-climber": ["lower"],
  "hanging-leg-raise": ["lower"],
  "toes-to-bar": ["lower"],
  "ab-rollout": ["shoulder"],
  // 데드리프트 계열 (등 ↔ 하체)
  deadlift: ["lower"],
  "sumo-deadlift": ["back"],
  rdl: ["back"],
  "stiff-leg-deadlift": ["back"],
  "good-morning": ["back"],
  // 스쿼트·런지 계열 (하체 + 코어)
  squat: ["core"],
  "front-squat": ["core"],
  "goblet-squat": ["core"],
  "hack-squat": ["core"],
  "bulgarian-split-squat": ["core"],
  lunge: ["core"],
  "walking-lunge": ["core"],
  "curtsy-lunge": ["core"],
  "step-up": ["core"],
  "pistol-squat": ["core"],
  "cossack-squat": ["core"],
  // 미는 운동 (가슴/어깨 + 삼두)
  "bench-press": ["arm"],
  "close-grip-bench-press": ["arm"],
  dips: ["arm"],
  "push-up": ["arm"],
  ohp: ["arm"],
  "arnold-press": ["arm"],
  // 당기는 운동 (등 + 이두)
  "pull-up": ["arm"],
  "chin-up": ["arm"],
  "barbell-row": ["arm"],
  "lat-pulldown": ["arm"],
  "low-row-machine": ["arm"],
  "chest-supported-row": ["arm"],
  "assisted-pull-up": ["arm"],
  // 풀스루 (하체 + 코어)
  "cable-pull-through": ["core"],
};

/**
 * 운동이 자극하는 모든 부위(주 + 보조), BODY_PART_ORDER 순서로 정렬·중복 제거.
 * 배지를 여러 개 달 때 사용.
 */
export function bodyPartsFor(id: string): BodyPart[] {
  const set = new Set<BodyPart>([primaryBodyPart(id), ...(EXTRA_BODY_PARTS[id] ?? [])]);
  return BODY_PART_ORDER.filter((p) => set.has(p));
}

/** 상체 대근육(전신 판정용) */
const UPPER_BODY_PARTS: BodyPart[] = ["chest", "back", "shoulder", "arm"];

/** 전신 태그 색(중립 회색) — 특정 부위 색과 구분. */

/**
 * 운동이 "제일 영향 많이 받는 대근육" 한 개의 표시용 태그.
 * 상체(가슴/등/어깨/팔) 중 하나와 하체를 **동시에** 쓰면 '전신'(데드리프트 등),
 * 아니면 1차 부위(가슴/팔/하체/코어…). 배지를 1개만 달 때 쓴다.
 */
export function majorMuscleTag(id: string): { label: string; tone: string } {
  const parts = bodyPartsFor(id);
  const isFullBody =
    parts.includes("lower") && parts.some((p) => UPPER_BODY_PARTS.includes(p));
  if (isFullBody) return { label: "전신", tone: FULLBODY_TONE };
  const primary = primaryBodyPart(id);
  return { label: BODY_PART_LABEL[primary], tone: BODY_PART_TONE[primary] };
}
