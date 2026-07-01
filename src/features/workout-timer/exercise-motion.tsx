/**
 * 운동 종목 → 모션 카테고리 매핑.
 * 카테고리는 상세 가이드(exercise-guides.ts)의 카테고리별 폴백 선택에 사용된다.
 * (예: 전용 가이드가 없는 로우 운동 → 'row' 카테고리 가이드)
 */

// 1,300 확장 운동의 동작 분류(자동 생성). 운동모드 일러스트·가이드가 동작에 맞게 나오게.
import { EXTRA_MOTION_CATEGORY } from "@/features/workout-timer/exercise-motion-extra";

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
  // 빠져 있어 'static' 으로 잘못 떨어지던 것들 — 실제 동작 패턴으로 교정.
  "low-row-machine": "row",
  "chest-supported-row": "row",
  "assisted-pull-up": "pulldown",
  "standing-cable-curl": "curl",
  "cable-pull-through": "hinge",
};

export function motionCategoryFor(exerciseId: string): MotionCategory {
  return (
    CATEGORY_MAP[exerciseId] ?? EXTRA_MOTION_CATEGORY[exerciseId] ?? "static"
  );
}

/* ─── 워밍업·마무리 카테고리 ──────────────────────────────────── */

/** 컨디셔닝(워밍업/마무리) 모션 카테고리 */
export type ConditioningMotion =
  | "run" // 러닝/걷기/줄넘기 — 다리 교차
  | "step" // 스텝/계단 — 한 다리씩
  | "cycle" // 자전거/로잉 — 페달 회전
  | "armCircle" // 어깨 회전/팔 돌리기
  | "spineFlow" // 캣카우/코브라 — 척추 굴곡
  | "stretch" // 정적 스트레칭 (서서/앉아) — 호흡 펄스
  | "bridge" // 글루트 브릿지/엉덩이 들기
  | "hang" // 데드행/매달림
  | "squatWarm"; // 보디웨이트 스쿼트/런지 워밍업

const CONDITIONING_MAP: Record<string, ConditioningMotion> = {
  // 유산소
  running: "run",
  walking: "run",
  "jump-rope": "run",
  "jumping-jack": "run",
  "stair-master": "step",
  cycling: "cycle",
  rowing: "cycle",
  elliptical: "cycle",
  // 모빌리티
  "shoulder-circle": "armCircle",
  "band-pull-apart": "armCircle",
  "wall-slide": "armCircle",
  "wrist-circle": "armCircle",
  "cat-cow": "spineFlow",
  "cobra-stretch": "spineFlow",
  "child-pose": "spineFlow",
  "hip-circle": "spineFlow",
  "dynamic-lunge": "squatWarm",
  "bw-squat": "squatWarm",
  "push-up-warm": "squatWarm",
  "glute-bridge-warm": "bridge",
  "dead-hang": "hang",
  "dead-bug": "stretch",
  // 정적 스트레칭
  "chest-door-stretch": "stretch",
  "shoulder-cross-stretch": "stretch",
  "lat-stretch": "stretch",
  "sleeper-stretch": "stretch",
  "triceps-overhead-stretch": "stretch",
  "biceps-door-stretch": "stretch",
  "wrist-stretch": "stretch",
  "hamstring-stretch": "stretch",
  "pigeon-pose": "stretch",
  "calf-stretch": "stretch",
  "neck-stretch": "stretch",
};

export function conditioningMotionFor(itemId: string): ConditioningMotion {
  return CONDITIONING_MAP[itemId] ?? "stretch";
}
