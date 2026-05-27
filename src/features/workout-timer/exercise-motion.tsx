/**
 * 운동 종목 → 모션 카테고리 매핑.
 * 카테고리는 측면뷰 플립북 일러스트(exercise-flipbook.tsx) 와 단계 안내
 * (exercise-phases.ts) 의 fallback 선택에 사용된다.
 */

export type MotionCategory =
  | "press"
  | "row"
  | "pulldown"
  | "squat"
  | "hinge"
  | "curl"
  | "extension"
  | "raise"
  | "static";

const CATEGORY_MAP: Record<string, MotionCategory> = {
  // 프레스
  "bench-press": "press",
  "incline-press": "press",
  "decline-press": "press",
  "chest-fly": "press",
  "pec-deck": "press",
  "cable-crossover": "press",
  "push-up": "press",
  dips: "press",
  "close-grip-bench-press": "press",
  "machine-chest-press": "press",
  "smith-bench-press": "press",
  "incline-cable-fly": "press",
  "dumbbell-pullover": "press",
  "diamond-pushup": "press",
  "bench-dip": "press",
  ohp: "press",
  "arnold-press": "press",
  "machine-shoulder-press": "press",
  // 로우
  "barbell-row": "row",
  "t-bar-row": "row",
  "one-arm-dumbbell-row": "row",
  "seated-cable-row": "row",
  "pendlay-row": "row",
  "meadows-row": "row",
  "inverted-row": "row",
  "face-pull": "row",
  "rear-delt-fly": "row",
  "reverse-pec-deck": "row",
  "machine-rear-delt-fly": "row",
  // 풀다운
  "lat-pulldown": "pulldown",
  "pull-up": "pulldown",
  "chin-up": "pulldown",
  "wide-grip-pull-up": "pulldown",
  "straight-arm-pulldown": "pulldown",
  // 하체
  squat: "squat",
  "front-squat": "squat",
  "leg-press": "squat",
  "hack-squat": "squat",
  "goblet-squat": "squat",
  "smith-squat": "squat",
  lunge: "squat",
  "bulgarian-split-squat": "squat",
  "walking-lunge": "squat",
  "step-up": "squat",
  "hip-thrust": "squat",
  "glute-bridge": "squat",
  "leg-extension": "squat",
  "leg-curl": "squat",
  "seated-leg-curl": "squat",
  "standing-calf-raise": "squat",
  "seated-calf-raise": "squat",
  "hip-abduction": "squat",
  "hip-adduction": "squat",
  "cable-kickback": "squat",
  "pistol-squat": "squat",
  // 힌지
  deadlift: "hinge",
  "sumo-deadlift": "hinge",
  rdl: "hinge",
  "stiff-leg-deadlift": "hinge",
  "good-morning": "hinge",
  hyperextension: "hinge",
  // 컬
  "biceps-curl": "curl",
  "hammer-curl": "curl",
  "preacher-curl": "curl",
  "ez-bar-curl": "curl",
  "incline-curl": "curl",
  "concentration-curl": "curl",
  "reverse-curl": "curl",
  "wrist-curl": "curl",
  "drag-curl": "curl",
  "zottman-curl": "curl",
  "cable-rope-hammer-curl": "curl",
  // 익스텐션
  "triceps-pushdown": "extension",
  "skull-crusher": "extension",
  "overhead-triceps-extension": "extension",
  "triceps-kickback": "extension",
  // 레이즈
  "lateral-raise": "raise",
  "front-raise": "raise",
  "cable-lateral-raise": "raise",
  "upright-row": "raise",
  shrug: "raise",
  // 정적
  plank: "static",
  "side-plank": "static",
  "hanging-leg-raise": "static",
  "cable-crunch": "static",
  "sit-up": "static",
  crunch: "static",
  "russian-twist": "static",
  "ab-rollout": "static",
  "mountain-climber": "static",
  "wood-chopper": "static",
  "pallof-press": "static",
  "bicycle-crunch": "static",
  "hollow-hold": "static",
  "reverse-crunch": "static",
  "toes-to-bar": "static",
  "v-up": "static",
  // 누락된 squat 계열
  "belt-squat": "squat",
  "box-squat": "squat",
  "cossack-squat": "squat",
  "curtsy-lunge": "squat",
  "sumo-squat": "squat",
  "sissy-squat": "squat",
  "single-leg-leg-press": "squat",
  "donkey-calf-raise": "squat",
};

export function motionCategoryFor(exerciseId: string): MotionCategory {
  return CATEGORY_MAP[exerciseId] ?? "static";
}
