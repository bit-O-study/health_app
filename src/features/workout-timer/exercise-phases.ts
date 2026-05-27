/**
 * 운동 단계별 안내 — 근육TV 스타일.
 * 한 사이클 안에서 단계 (예: "준비 → 내리기 → 정점 → 올리기") 가 텍스트로 순환.
 * 각 단계는 호흡·자세 디테일까지 한 줄에 담음.
 *
 * 우선순위:
 * 1. EXERCISE_PHASES[id] — 특정 운동 전용 (벤치프레스, 스쿼트 등)
 * 2. PHASES_BY_CATEGORY[category] — 카테고리 기본값 (그 외 prefix 매칭되는 운동)
 */

import { motionCategoryFor, type MotionCategory } from "@/features/workout-timer/exercise-motion";

export type ExercisePhase = {
  /** 짧은 단계명 (4~6자) — 큰 글씨 */
  name: string;
  /** 한 줄 안내 — 자세·호흡·템포 디테일 */
  instruction: string;
};

/** 운동에 매핑된 활성 근육 라벨. SVG 콜아웃 라인으로 보여줄 한국어 이름. */
export type MuscleLabel = {
  /** 캔버스 0~100 % 좌표 (근육 위치) */
  x: number;
  y: number;
  /** 텍스트 위치 (보통 좌·우 가장자리) */
  textX: number;
  textY: number;
  /** 텍스트 정렬 (left 면 line 이 우→좌) */
  align: "left" | "right";
  label: string;
};

/** 운동 ID → 활성 근육 콜아웃 (1~3개) */
export const MUSCLE_LABELS: Record<string, MuscleLabel[]> = {
  // PRESS — 가슴/어깨/삼두
  "bench-press": [
    { x: 50, y: 48, textX: 96, textY: 50, align: "right", label: "대흉근" },
    { x: 35, y: 32, textX: 4, textY: 30, align: "left", label: "전면 삼각근" },
    { x: 28, y: 60, textX: 4, textY: 60, align: "left", label: "삼두" },
  ],
  "incline-press": [
    { x: 50, y: 42, textX: 96, textY: 44, align: "right", label: "상부 대흉근" },
    { x: 35, y: 32, textX: 4, textY: 30, align: "left", label: "전면 삼각근" },
  ],
  ohp: [
    { x: 30, y: 32, textX: 4, textY: 32, align: "left", label: "전면 삼각근" },
    { x: 70, y: 32, textX: 96, textY: 32, align: "right", label: "측면 삼각근" },
    { x: 32, y: 24, textX: 4, textY: 22, align: "left", label: "삼두" },
  ],
  "chest-fly": [
    { x: 50, y: 48, textX: 96, textY: 50, align: "right", label: "대흉근(모음)" },
  ],
  dips: [
    { x: 50, y: 50, textX: 96, textY: 50, align: "right", label: "하부 대흉근" },
    { x: 28, y: 58, textX: 4, textY: 60, align: "left", label: "삼두" },
  ],
  "push-up": [
    { x: 50, y: 48, textX: 96, textY: 50, align: "right", label: "대흉근" },
    { x: 28, y: 58, textX: 4, textY: 60, align: "left", label: "삼두 · 코어" },
  ],
  // ROW — 등
  "barbell-row": [
    { x: 35, y: 55, textX: 4, textY: 55, align: "left", label: "광배근" },
    { x: 65, y: 55, textX: 96, textY: 55, align: "right", label: "능형근" },
  ],
  "lat-pulldown": [
    { x: 35, y: 55, textX: 4, textY: 55, align: "left", label: "광배근" },
    { x: 65, y: 55, textX: 96, textY: 55, align: "right", label: "광배근" },
  ],
  "pull-up": [
    { x: 35, y: 55, textX: 4, textY: 55, align: "left", label: "광배근" },
    { x: 28, y: 38, textX: 4, textY: 36, align: "left", label: "이두" },
  ],
  "face-pull": [
    { x: 30, y: 35, textX: 4, textY: 35, align: "left", label: "후면 삼각근" },
    { x: 70, y: 35, textX: 96, textY: 35, align: "right", label: "능형근" },
  ],
  // SQUAT — 하체
  squat: [
    { x: 41, y: 108, textX: 4, textY: 110, align: "left", label: "대퇴사두" },
    { x: 50, y: 92, textX: 96, textY: 95, align: "right", label: "둔근" },
  ],
  "front-squat": [
    { x: 41, y: 108, textX: 4, textY: 110, align: "left", label: "대퇴사두" },
    { x: 50, y: 70, textX: 96, textY: 72, align: "right", label: "코어" },
  ],
  "leg-press": [
    { x: 41, y: 108, textX: 4, textY: 110, align: "left", label: "대퇴사두" },
  ],
  lunge: [
    { x: 41, y: 108, textX: 4, textY: 110, align: "left", label: "대퇴사두" },
    { x: 50, y: 92, textX: 96, textY: 92, align: "right", label: "둔근" },
  ],
  "hip-thrust": [
    { x: 50, y: 92, textX: 96, textY: 92, align: "right", label: "대둔근" },
    { x: 41, y: 120, textX: 4, textY: 122, align: "left", label: "햄스트링" },
  ],
  // HINGE — 후면 사슬
  deadlift: [
    { x: 50, y: 75, textX: 96, textY: 75, align: "right", label: "척추기립근" },
    { x: 41, y: 120, textX: 4, textY: 122, align: "left", label: "햄스트링" },
    { x: 50, y: 88, textX: 96, textY: 90, align: "right", label: "둔근" },
  ],
  rdl: [
    { x: 41, y: 120, textX: 4, textY: 122, align: "left", label: "햄스트링" },
    { x: 50, y: 92, textX: 96, textY: 92, align: "right", label: "둔근" },
  ],
  "sumo-deadlift": [
    { x: 50, y: 92, textX: 96, textY: 92, align: "right", label: "내전근 · 둔근" },
    { x: 50, y: 75, textX: 4, textY: 75, align: "left", label: "척추기립근" },
  ],
  // CURL — 이두
  "biceps-curl": [
    { x: 26, y: 55, textX: 4, textY: 55, align: "left", label: "이두 장두" },
    { x: 74, y: 55, textX: 96, textY: 55, align: "right", label: "이두 단두" },
  ],
  "hammer-curl": [
    { x: 26, y: 55, textX: 4, textY: 55, align: "left", label: "상완근" },
    { x: 74, y: 55, textX: 96, textY: 55, align: "right", label: "이두" },
  ],
  "preacher-curl": [
    { x: 26, y: 55, textX: 4, textY: 55, align: "left", label: "이두 단두" },
  ],
  // EXTENSION — 삼두
  "triceps-pushdown": [
    { x: 30, y: 58, textX: 4, textY: 60, align: "left", label: "삼두 외측두" },
    { x: 70, y: 58, textX: 96, textY: 60, align: "right", label: "삼두 장두" },
  ],
  "skull-crusher": [
    { x: 30, y: 58, textX: 4, textY: 60, align: "left", label: "삼두 장두" },
  ],
  // RAISE — 어깨 측면
  "lateral-raise": [
    { x: 30, y: 36, textX: 4, textY: 36, align: "left", label: "측면 삼각근" },
    { x: 70, y: 36, textX: 96, textY: 36, align: "right", label: "측면 삼각근" },
  ],
  "front-raise": [
    { x: 30, y: 32, textX: 4, textY: 32, align: "left", label: "전면 삼각근" },
  ],
  shrug: [
    { x: 50, y: 28, textX: 96, textY: 28, align: "right", label: "승모근" },
  ],
  // STATIC — 코어
  plank: [
    { x: 50, y: 62, textX: 96, textY: 62, align: "right", label: "복직근 · 코어" },
  ],
  "hanging-leg-raise": [
    { x: 50, y: 62, textX: 96, textY: 62, align: "right", label: "하복부" },
  ],
};

export function musclesFor(exerciseId: string): MuscleLabel[] {
  return MUSCLE_LABELS[exerciseId] ?? [];
}

/* ─── 카테고리별 기본 단계 ─────────────────────────────────────────── */

const PHASES_BY_CATEGORY: Record<MotionCategory, ExercisePhase[]> = {
  press: [
    { name: "준비", instruction: "견갑 모으고 어깨 안정. 호흡 들이마심" },
    { name: "내리기 (2~3초)", instruction: "통제하며 천천히 내림 — 반동 없이" },
    { name: "정점 멈춤", instruction: "최저점에서 0.5초 멈춰 자극 유지" },
    { name: "밀어 올리기", instruction: "호흡 내쉬며 폭발적으로 밀기" },
  ],
  row: [
    { name: "준비", instruction: "허리 펴고 코어 잠금. 어깨 으쓱하지 않기" },
    { name: "당기기", instruction: "팔이 아닌 등으로 당김 — 견갑 모으기" },
    { name: "정점 수축", instruction: "최고점에서 광배 짜내듯 멈춤" },
    { name: "복귀", instruction: "통제하며 천천히 처음 자리로" },
  ],
  pulldown: [
    { name: "준비", instruction: "팔을 완전히 펴 광배 늘어뜨림" },
    { name: "당기기", instruction: "팔꿈치를 갈비뼈 쪽으로 — 등으로 당김" },
    { name: "정점 수축", instruction: "광배 최대 수축 — 1초 멈춤" },
    { name: "복귀", instruction: "통제하며 천천히 — 어깨 위로 솟지 않게" },
  ],
  squat: [
    { name: "준비", instruction: "발 어깨너비, 코어 잠금. 호흡 들이마심" },
    { name: "내려가기 (2~3초)", instruction: "엉덩이 뒤로 보내며 허벅지 평행까지" },
    { name: "정점 멈춤", instruction: "허리 펴고 자세 유지" },
    { name: "올라오기", instruction: "발 전체로 밀어 일어남, 호흡 내쉼" },
  ],
  hinge: [
    { name: "준비", instruction: "코어 잠금, 척추 중립, 어깨는 바보다 살짝 앞" },
    { name: "들어올리기", instruction: "다리로 밀며 엉덩이를 앞으로 — 등으로 들지 않기" },
    { name: "정점", instruction: "둔근 강하게 짜내며 일어섬" },
    { name: "내리기 (2~3초)", instruction: "엉덩이부터 뒤로 보내며 천천히 내림" },
  ],
  curl: [
    { name: "준비", instruction: "팔꿈치 옆구리에 고정. 손목은 일직선" },
    { name: "올리기", instruction: "팔꿈치만 굽혀 천천히 들어올림" },
    { name: "정점 수축", instruction: "이두 최대 수축 — 1초 짜내듯 멈춤" },
    { name: "내리기 (2~3초)", instruction: "통제하며 천천히 내림 — 반동 X" },
  ],
  extension: [
    { name: "준비", instruction: "팔꿈치 옆구리 고정. 위팔만 움직임" },
    { name: "펴기", instruction: "전완만 펴서 통제하며 내림" },
    { name: "정점 수축", instruction: "삼두 최대 수축 — 잠시 멈춤" },
    { name: "복귀 (2초)", instruction: "팔꿈치 위치 그대로, 전완만 회복" },
  ],
  raise: [
    { name: "준비", instruction: "팔꿈치 살짝 굽혀 옆에 — 어깨는 으쓱하지 않음" },
    { name: "들어올리기", instruction: "팔꿈치가 손목보다 약간 위로 — 어깨 높이까지" },
    { name: "정점", instruction: "측면 삼각근 짜내듯 0.5초 멈춤" },
    { name: "내리기 (2~3초)", instruction: "통제하며 천천히 내림 — 반동 X" },
  ],
  static: [
    { name: "정렬", instruction: "머리부터 발끝까지 일직선. 엉덩이 처짐·들림 X" },
    { name: "코어 잠금", instruction: "복부에 힘 주고 호흡은 자연스럽게" },
    { name: "유지", instruction: "어깨 으쓱하지 않게 견갑 안정" },
    { name: "마무리", instruction: "30초 ~ 1분 목표 — 자세 흐트러지면 중단" },
  ],
};

/* ─── 운동별 전용 단계 (가장 디테일한 안내가 필요한 종목) ───────── */

const EXERCISE_PHASES: Record<string, ExercisePhase[]> = {
  "bench-press": [
    { name: "준비", instruction: "견갑을 모아 벤치에 단단히 고정. 발은 바닥에 디딤" },
    {
      name: "내리기 (2~3초)",
      instruction: "팔꿈치 45도 유지, 바를 가슴 중앙(유두선)까지 통제하며 내림",
    },
    {
      name: "정점 멈춤",
      instruction: "바가 가슴에 살짝 닿으면 0.5초 멈춤 — 반동으로 튕기지 않기",
    },
    {
      name: "밀어 올리기",
      instruction: "발로 바닥 밀며 호흡 내쉬고 바를 폭발적으로 밀어 올림",
    },
  ],
  squat: [
    { name: "준비", instruction: "발 어깨너비, 발끝은 살짝 바깥. 코어 잠그고 호흡 들이마심" },
    {
      name: "내려가기 (2~3초)",
      instruction: "엉덩이 먼저 뒤로 → 허벅지가 바닥과 평행할 때까지",
    },
    {
      name: "정점 멈춤",
      instruction: "허리 둥글지 않게 — 골반 말림(butt wink) 주의",
    },
    {
      name: "올라오기",
      instruction: "발 전체로 밀어 일어남, 무릎은 발끝 방향 유지. 호흡 내쉼",
    },
  ],
  deadlift: [
    {
      name: "준비",
      instruction: "발 골반 너비, 바는 발등 위. 정강이 닿을 정도로 다가가 바 잡기",
    },
    {
      name: "셋업",
      instruction: "어깨를 바보다 약간 앞에. 허리 펴고 코어 잠금, 가슴 위로",
    },
    {
      name: "들기",
      instruction: "다리로 밀고 엉덩이를 앞으로 — 바는 다리 따라 위로 (몸에 가깝게)",
    },
    {
      name: "내려놓기 (3초)",
      instruction: "엉덩이부터 뒤로 보내며 통제하며 내림 — 허리 둥글지 않게",
    },
  ],
  rdl: [
    {
      name: "준비",
      instruction: "발 어깨너비. 무릎은 살짝만 굽힘 (스쿼트 X), 척추 중립",
    },
    {
      name: "내리기 (2~3초)",
      instruction: "엉덩이를 뒤로 보내며 바를 다리 따라 미끄러뜨림",
    },
    {
      name: "정점",
      instruction: "햄스트링 늘어남 느낌 — 보통 정강이 중간까지",
    },
    {
      name: "올라오기",
      instruction: "둔근 짜내며 엉덩이를 앞으로 — 완전 직립까지",
    },
  ],
  "pull-up": [
    {
      name: "준비",
      instruction: "바를 어깨너비보다 약간 넓게 잡고 완전히 매달림. 견갑 하강",
    },
    {
      name: "당기기",
      instruction: "팔꿈치를 갈비뼈 쪽으로 끌어내림 — 가슴이 바에 가까워질 때까지",
    },
    {
      name: "정점 수축",
      instruction: "광배 최대 수축 — 턱이 바 위로",
    },
    {
      name: "내리기 (2~3초)",
      instruction: "통제하며 천천히 — 어깨가 으쓱하지 않게",
    },
  ],
  "biceps-curl": [
    {
      name: "준비",
      instruction: "팔꿈치를 옆구리에 단단히 붙이고 손목 일직선",
    },
    {
      name: "올리기",
      instruction: "팔꿈치만 굽혀 덤벨을 어깨까지 — 반동 X",
    },
    {
      name: "정점 수축",
      instruction: "이두 짜내며 1초 멈춤 — 손목 꺾이지 않게",
    },
    {
      name: "내리기 (2~3초)",
      instruction: "통제하며 천천히 처음 자리로 — 팔꿈치 위치 그대로",
    },
  ],
  ohp: [
    {
      name: "준비",
      instruction: "발 어깨너비. 바는 쇄골 위, 코어 단단히 잠금",
    },
    {
      name: "밀어 올리기",
      instruction: "수직으로 밀고 머리는 살짝 뒤로 — 바가 머리 위에서 정점",
    },
    {
      name: "정점",
      instruction: "팔을 완전히 펴고 어깨 정렬 — 갈비뼈 들리지 않게",
    },
    {
      name: "내리기 (2초)",
      instruction: "쇄골까지 통제하며 내림 — 어깨가 귀쪽으로 솟지 않게",
    },
  ],
  "lateral-raise": [
    {
      name: "준비",
      instruction: "팔꿈치 살짝 굽혀 옆에. 어깨는 으쓱하지 않음",
    },
    {
      name: "들어올리기",
      instruction: "팔꿈치가 손목보다 약간 위로 — 어깨 높이까지",
    },
    {
      name: "정점",
      instruction: "측면 삼각근 짜내듯 0.5초 멈춤",
    },
    {
      name: "내리기 (2~3초)",
      instruction: "통제하며 천천히 — 반동으로 다음 세트 시작 X",
    },
  ],
  "lat-pulldown": [
    {
      name: "준비",
      instruction: "팔 완전히 펴고 광배 늘어뜨림. 어깨 견갑 먼저 하강",
    },
    {
      name: "당기기",
      instruction: "팔꿈치를 갈비뼈 쪽으로 — 바를 쇄골 약간 위까지",
    },
    {
      name: "정점 수축",
      instruction: "광배 최대 수축 — 1초 짜내듯 멈춤",
    },
    {
      name: "복귀 (2~3초)",
      instruction: "통제하며 천천히 위로 — 어깨가 으쓱하지 않게",
    },
  ],
  "hip-thrust": [
    {
      name: "준비",
      instruction: "어깨를 벤치에 얹고 발은 어깨너비. 발 위치는 무릎 90도 되도록",
    },
    {
      name: "올리기",
      instruction: "둔근 짜내며 엉덩이를 위로 — 몸이 어깨~무릎 일직선",
    },
    {
      name: "정점",
      instruction: "둔근 최대 수축 — 1초 멈춤. 갈비뼈 들리지 않게",
    },
    {
      name: "내리기 (2초)",
      instruction: "통제하며 천천히 — 허리로 들지 말고 둔근으로",
    },
  ],
  "push-up": [
    {
      name: "준비",
      instruction: "손은 어깨 아래, 머리부터 발끝까지 일직선. 코어 잠금",
    },
    {
      name: "내리기 (2~3초)",
      instruction: "팔꿈치 45도 유지하며 가슴이 바닥 가까이",
    },
    {
      name: "정점 멈춤",
      instruction: "엉덩이 처지지 않게 — 일직선 유지",
    },
    {
      name: "밀기",
      instruction: "호흡 내쉬며 폭발적으로 밀어 올림",
    },
  ],
  plank: [
    {
      name: "정렬",
      instruction: "팔꿈치 어깨 아래. 머리~발끝 일직선",
    },
    {
      name: "코어 잠금",
      instruction: "복부 단단히, 둔근에도 살짝 힘",
    },
    {
      name: "유지",
      instruction: "엉덩이 처짐 X, 솟음 X. 호흡 자연스럽게",
    },
    {
      name: "마무리",
      instruction: "30초~1분 목표 — 자세 흐트러지면 즉시 중단",
    },
  ],
};

/** 운동 ID 의 단계 안내. 전용 → 카테고리 → 빈 배열 순서로 fallback. */
export function phasesFor(exerciseId: string): ExercisePhase[] {
  return (
    EXERCISE_PHASES[exerciseId] ??
    PHASES_BY_CATEGORY[motionCategoryFor(exerciseId)] ??
    []
  );
}

/** 해당 운동의 한 사이클 시간(ms) — animation 키프레임과 일치 */
export function cycleDurationMs(exerciseId: string): number {
  const cat = motionCategoryFor(exerciseId);
  switch (cat) {
    case "press":
      return 2600;
    case "row":
      return 2200;
    case "pulldown":
      return 2800;
    case "squat":
      return 2800;
    case "hinge":
      return 2800;
    case "curl":
      return 1900;
    case "extension":
      return 1900;
    case "raise":
      return 2400;
    case "static":
      return 3600;
  }
}
