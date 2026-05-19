/**
 * 루틴 표시용 운동 카탈로그 (코드 기반).
 *
 * 부위(FocusTone) → 대표 운동 → 운동별 기구 변형 → 기구별 운동법 단계.
 * 메인 "오늘의 운동"에서 운동마다 기구를 고르면 해당 기구 운동법을 보여준다.
 */

import type { FocusTone } from "@/features/routine/data";

export type EquipmentId =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight";

export const EQUIPMENT_LABELS: Record<EquipmentId, string> = {
  barbell: "바벨",
  dumbbell: "덤벨",
  machine: "머신",
  cable: "케이블",
  bodyweight: "맨몸",
};

export type EquipmentVariant = {
  equipment: EquipmentId;
  /** 기구별 운동법 단계 */
  method: string[];
};

export type CatalogExercise = {
  id: string;
  name: string;
  /** 자극 부위 요약 */
  target: string;
  /** 선택 가능한 기구 (첫 항목이 기본 선택) */
  equipments: EquipmentVariant[];
};

/** 운동 마스터 (여러 부위에서 재사용) */
const EXERCISES: Record<string, CatalogExercise> = {
  "bench-press": {
    id: "bench-press",
    name: "벤치프레스",
    target: "대흉근 · 삼두 · 전면 삼각근",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "견갑을 모아 벤치에 고정하고 어깨너비보다 약간 넓게 잡기",
          "바를 가슴 중앙으로 내리며 팔꿈치는 45도 유지",
          "발로 바닥을 밀며 호흡 내쉬고 밀어 올리기",
        ],
      },
      {
        equipment: "dumbbell",
        method: [
          "덤벨을 가슴 옆에서 시작, 손목을 곧게 유지",
          "팔꿈치를 너무 벌리지 말고 가슴 위로 모아 올리기",
          "맨 위에서 살짝 안쪽으로 모아 수축",
        ],
      },
      {
        equipment: "machine",
        method: [
          "손잡이가 가슴 중앙 높이에 오도록 시트 조절",
          "견갑 고정 상태로 끝까지 밀고 천천히 복귀",
          "반동 없이 일정한 속도 유지",
        ],
      },
    ],
  },
  "incline-press": {
    id: "incline-press",
    name: "인클라인 프레스",
    target: "상부 대흉근 · 전면 삼각근",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "벤치 각도 30~45도, 견갑 고정",
          "바를 쇄골 약간 아래로 내리기",
          "팔꿈치 과신전 없이 밀어 올리기",
        ],
      },
      {
        equipment: "dumbbell",
        method: [
          "덤벨을 어깨 라인에서 시작",
          "가슴 상부에 자극 느끼며 위로 모아 올리기",
          "내릴 때 통제하며 가동범위 확보",
        ],
      },
    ],
  },
  "chest-fly": {
    id: "chest-fly",
    name: "체스트 플라이",
    target: "대흉근(모음)",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "팔꿈치 약간 굽힌 각도 고정",
          "큰 호를 그리며 가슴을 늘렸다 모으기",
          "어깨가 말리지 않게 견갑 고정",
        ],
      },
      {
        equipment: "cable",
        method: [
          "도르래를 가슴 높이에 맞추고 한 발 앞으로",
          "팔꿈치 각 유지하며 가슴 앞에서 모으기",
          "수축에서 1초 정지 후 천천히 복귀",
        ],
      },
      {
        equipment: "machine",
        method: [
          "패드가 가슴 높이에 오도록 시트 조절",
          "팔꿈치로 밀어 가슴 앞에서 모으기",
          "반동 없이 끝까지 수축",
        ],
      },
    ],
  },
  dips: {
    id: "dips",
    name: "딥스",
    target: "하부 대흉근 · 삼두",
    equipments: [
      {
        equipment: "bodyweight",
        method: [
          "어깨 내려 고정하고 몸을 약간 앞으로 기울이기",
          "팔꿈치 90도까지 내려가며 가슴 늘리기",
          "삼두·가슴으로 밀어 올리되 어깨 으쓱 금지",
        ],
      },
    ],
  },
  deadlift: {
    id: "deadlift",
    name: "데드리프트",
    target: "둔근 · 햄스트링 · 척추기립근",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "바를 발 중앙 위, 정강이 가까이 두기",
          "등을 편 채 엉덩이와 가슴 동시에 세우기",
          "바를 몸에 붙여 끌어올리고 정점에서 둔근 수축",
        ],
      },
    ],
  },
  "barbell-row": {
    id: "barbell-row",
    name: "로우",
    target: "광배근 · 승모근 · 이두",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "힙 힌지로 상체 45도 숙이고 등 펴기",
          "바를 배꼽 쪽으로 당기며 견갑 모으기",
          "반동 없이 천천히 복귀",
        ],
      },
      {
        equipment: "dumbbell",
        method: [
          "벤치에 한 손 지지, 등 평평하게",
          "덤벨을 골반 쪽으로 당기며 팔꿈치 뒤로",
          "광배 수축 후 통제하며 내리기",
        ],
      },
    ],
  },
  "lat-pulldown": {
    id: "lat-pulldown",
    name: "랫풀다운",
    target: "광배근 · 이두",
    equipments: [
      {
        equipment: "machine",
        method: [
          "허벅지 패드 고정, 가슴 들고 약간 뒤로",
          "바를 쇄골 쪽으로 당기며 팔꿈치 아래로",
          "광배 수축 후 천천히 복귀",
        ],
      },
      {
        equipment: "cable",
        method: [
          "케이블 손잡이를 어깨너비로 잡기",
          "팔꿈치를 옆구리로 끌어내리며 견갑 하강",
          "정점 수축 1초 후 통제 복귀",
        ],
      },
    ],
  },
  "pull-up": {
    id: "pull-up",
    name: "풀업",
    target: "광배근 · 이두",
    equipments: [
      {
        equipment: "bodyweight",
        method: [
          "어깨너비보다 약간 넓게 오버그립",
          "견갑 하강 후 가슴을 바 쪽으로 끌어올리기",
          "내릴 때 완전히 펴며 통제",
        ],
      },
    ],
  },
  ohp: {
    id: "ohp",
    name: "오버헤드프레스",
    target: "삼각근 · 삼두",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "바를 쇄골 위, 코어·둔근 단단히",
          "머리 피하며 수직으로 밀어 올리기",
          "정점에서 바가 정수리 위 일직선",
        ],
      },
      {
        equipment: "dumbbell",
        method: [
          "덤벨을 귀 옆 높이에서 시작",
          "팔꿈치 약간 앞, 위에서 살짝 모으기",
          "허리 과신전 없이 코어 고정",
        ],
      },
      {
        equipment: "machine",
        method: [
          "손잡이가 어깨 높이에 오도록 시트 조절",
          "끝까지 밀고 천천히 복귀",
          "반동 없이 일정 속도",
        ],
      },
    ],
  },
  "lateral-raise": {
    id: "lateral-raise",
    name: "사이드 레터럴 레이즈",
    target: "측면 삼각근",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "팔꿈치 살짝 굽히고 새끼손가락 살짝 위로",
          "어깨 높이까지만 양옆으로 들기",
          "반동 없이 천천히 내리기",
        ],
      },
      {
        equipment: "cable",
        method: [
          "낮은 도르래를 몸 뒤·옆에 두고 한쪽씩",
          "측면 삼각근으로 어깨 높이까지 들기",
          "장력 유지하며 통제 복귀",
        ],
      },
    ],
  },
  "face-pull": {
    id: "face-pull",
    name: "페이스풀",
    target: "후면 삼각근 · 승모근",
    equipments: [
      {
        equipment: "cable",
        method: [
          "도르래를 얼굴 높이, 로프 양끝 잡기",
          "팔꿈치 높게 유지하며 얼굴 쪽으로 당기기",
          "견갑 모으고 1초 정지 후 복귀",
        ],
      },
    ],
  },
  "biceps-curl": {
    id: "biceps-curl",
    name: "바이셉스 컬",
    target: "이두",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "팔꿈치를 옆구리에 고정",
          "반동 없이 바를 들어 이두 수축",
          "천천히 끝까지 펴며 내리기",
        ],
      },
      {
        equipment: "dumbbell",
        method: [
          "손목을 살짝 회외하며 올리기",
          "팔꿈치 고정, 양팔 번갈아 또는 동시",
          "정점 수축 후 통제 복귀",
        ],
      },
      {
        equipment: "cable",
        method: [
          "낮은 도르래, 장력 유지된 상태로 시작",
          "팔꿈치 고정하고 수축",
          "내릴 때 장력 놓지 않기",
        ],
      },
    ],
  },
  "hammer-curl": {
    id: "hammer-curl",
    name: "해머컬",
    target: "이두 · 전완",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "손바닥이 마주 보는 중립 그립",
          "팔꿈치 고정하고 들어 올리기",
          "전완·이두 수축 후 천천히 복귀",
        ],
      },
    ],
  },
  "triceps-pushdown": {
    id: "triceps-pushdown",
    name: "트라이셉스 푸시다운",
    target: "삼두",
    equipments: [
      {
        equipment: "cable",
        method: [
          "팔꿈치를 옆구리에 고정",
          "팔만 펴서 끝까지 밀어 삼두 수축",
          "반동 없이 천천히 복귀",
        ],
      },
      {
        equipment: "machine",
        method: [
          "시트·패드 조절 후 팔꿈치 고정",
          "끝까지 밀고 통제하며 복귀",
          "어깨 개입 최소화",
        ],
      },
    ],
  },
  squat: {
    id: "squat",
    name: "스쿼트",
    target: "대퇴사두 · 둔근 · 햄스트링",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "바를 승모근 위, 코어 단단히",
          "무릎과 발끝 방향 맞추고 엉덩이 뒤로",
          "허벅지 평행까지 내렸다 발 전체로 밀기",
        ],
      },
      {
        equipment: "machine",
        method: [
          "패드 위치·발판 조절",
          "허리 중립 유지하며 통제된 깊이까지",
          "무릎 안쪽 모임 없이 밀어 올리기",
        ],
      },
      {
        equipment: "bodyweight",
        method: [
          "발 어깨너비, 가슴 들고 시선 정면",
          "엉덩이 뒤로 빼며 평행까지 앉기",
          "발뒤꿈치로 밀며 일어서기",
        ],
      },
    ],
  },
  "leg-press": {
    id: "leg-press",
    name: "레그프레스",
    target: "대퇴사두 · 둔근",
    equipments: [
      {
        equipment: "machine",
        method: [
          "발을 어깨너비로 발판 중앙에",
          "허리 시트에서 떨어지지 않게 깊이 조절",
          "무릎 완전 잠금 없이 밀기",
        ],
      },
    ],
  },
  rdl: {
    id: "rdl",
    name: "루마니안 데드리프트",
    target: "햄스트링 · 둔근",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "무릎 살짝 굽힌 각 유지",
          "엉덩이 뒤로 보내며 바를 다리 따라 내리기",
          "햄스트링 늘어남 느끼고 둔근으로 세우기",
        ],
      },
      {
        equipment: "dumbbell",
        method: [
          "덤벨을 허벅지 앞에 두고 힙 힌지",
          "등 펴고 정강이 중간까지 내리기",
          "둔근 수축하며 상체 세우기",
        ],
      },
    ],
  },
  "leg-curl": {
    id: "leg-curl",
    name: "레그컬",
    target: "햄스트링",
    equipments: [
      {
        equipment: "machine",
        method: [
          "패드를 발목 위에 맞추고 골반 고정",
          "햄스트링으로 끝까지 굽히기",
          "반동 없이 천천히 복귀",
        ],
      },
    ],
  },
  plank: {
    id: "plank",
    name: "플랭크",
    target: "복근 · 코어",
    equipments: [
      {
        equipment: "bodyweight",
        method: [
          "팔꿈치 어깨 아래, 몸 일직선",
          "복부·둔근 조여 허리 처짐 방지",
          "호흡 유지하며 30~60초",
        ],
      },
    ],
  },
  "hanging-leg-raise": {
    id: "hanging-leg-raise",
    name: "행잉 레그레이즈",
    target: "하복부 · 코어",
    equipments: [
      {
        equipment: "bodyweight",
        method: [
          "바에 매달려 견갑 살짝 고정",
          "골반을 말아 다리를 들어 올리기",
          "반동 없이 천천히 내리기",
        ],
      },
    ],
  },
  "cable-crunch": {
    id: "cable-crunch",
    name: "케이블 크런치",
    target: "복근",
    equipments: [
      {
        equipment: "cable",
        method: [
          "로프를 머리 옆에 두고 무릎 꿇기",
          "복부를 말아 상체를 굽히기",
          "엉덩이 회전 아닌 복근 수축에 집중",
        ],
      },
    ],
  },
  "hip-thrust": {
    id: "hip-thrust",
    name: "힙 스러스트",
    target: "둔근 · 햄스트링",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "견갑을 벤치에 걸치고 바를 골반에 패드와 함께 올리기",
          "발로 바닥 밀며 엉덩이를 끝까지 들어 둔근 수축",
          "정점에서 1초 정지 후 천천히 내리기",
        ],
      },
      {
        equipment: "machine",
        method: [
          "패드를 골반에 맞추고 발 위치 조절",
          "둔근으로 밀어 끝까지 펴기",
          "허리 과신전 없이 통제 복귀",
        ],
      },
    ],
  },
  "glute-bridge": {
    id: "glute-bridge",
    name: "글루트 브릿지",
    target: "둔근 · 코어",
    equipments: [
      {
        equipment: "bodyweight",
        method: [
          "무릎 세워 눕고 발은 엉덩이 가까이",
          "둔근 조여 엉덩이를 들어 일직선",
          "정점에서 1초 정지 후 내리기",
        ],
      },
      {
        equipment: "barbell",
        method: [
          "바를 골반 위에 패드와 함께 올리기",
          "둔근으로 밀어 골반 들기",
          "허리 아닌 둔근으로 수축",
        ],
      },
    ],
  },
  lunge: {
    id: "lunge",
    name: "런지",
    target: "대퇴사두 · 둔근",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "덤벨을 양손에 들고 한 발 앞으로",
          "뒤 무릎이 바닥 가까이 오도록 내리기",
          "앞발로 밀어 시작 자세 복귀",
        ],
      },
      {
        equipment: "bodyweight",
        method: [
          "상체 세우고 한 발 앞으로 디디기",
          "양 무릎 90도까지 내리기",
          "앞꿈치로 밀어 균형 유지하며 복귀",
        ],
      },
    ],
  },
  "bulgarian-split-squat": {
    id: "bulgarian-split-squat",
    name: "불가리안 스플릿 스쿼트",
    target: "대퇴사두 · 둔근",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "뒷발을 벤치에 올리고 덤벨 들기",
          "앞 허벅지가 평행이 되도록 내리기",
          "앞발로 밀어 올리며 균형 유지",
        ],
      },
      {
        equipment: "bodyweight",
        method: [
          "뒷발 벤치에 올리고 상체 세우기",
          "앞 무릎 방향 맞춰 깊게 내리기",
          "앞꿈치로 밀어 복귀",
        ],
      },
    ],
  },
  "cable-kickback": {
    id: "cable-kickback",
    name: "케이블 킥백",
    target: "둔근",
    equipments: [
      {
        equipment: "cable",
        method: [
          "발목에 스트랩 걸고 살짝 숙이기",
          "무릎 각 유지하며 다리를 뒤로 차기",
          "둔근 수축 1초 후 통제 복귀",
        ],
      },
    ],
  },
  "hip-abduction": {
    id: "hip-abduction",
    name: "힙 어브덕션",
    target: "중둔근",
    equipments: [
      {
        equipment: "machine",
        method: [
          "패드에 무릎 바깥쪽을 대고 앉기",
          "다리를 바깥으로 벌려 중둔근 수축",
          "반동 없이 천천히 모으기",
        ],
      },
    ],
  },
};

type FocusKey = Exclude<FocusTone, "rest">;

/** 부위 → 운동 id 목록 (남성 기본) */
const FOCUS_EXERCISES: Record<FocusKey, string[]> = {
  fullbody: ["squat", "bench-press", "barbell-row"],
  upper: ["bench-press", "barbell-row", "ohp"],
  lower: ["squat", "rdl", "leg-press", "leg-curl"],
  chest: ["bench-press", "incline-press", "chest-fly", "dips"],
  back: ["deadlift", "barbell-row", "lat-pulldown", "pull-up"],
  shoulder: ["ohp", "lateral-raise", "face-pull"],
  arm: ["biceps-curl", "hammer-curl", "triceps-pushdown"],
  push: ["bench-press", "ohp", "dips"],
  pull: ["deadlift", "barbell-row", "lat-pulldown"],
  core: ["plank", "hanging-leg-raise", "cable-crunch"],
};

/** 부위 → 운동 id 목록 (여성: 둔근·하체·코어 강조) */
const FOCUS_EXERCISES_FEMALE: Record<FocusKey, string[]> = {
  fullbody: ["squat", "hip-thrust", "barbell-row"],
  upper: ["lat-pulldown", "chest-fly", "lateral-raise"],
  lower: ["hip-thrust", "squat", "lunge", "bulgarian-split-squat", "leg-curl"],
  chest: ["incline-press", "chest-fly", "dips"],
  back: ["lat-pulldown", "barbell-row", "face-pull"],
  shoulder: ["lateral-raise", "ohp", "face-pull"],
  arm: ["biceps-curl", "triceps-pushdown", "hammer-curl"],
  push: ["incline-press", "ohp", "chest-fly"],
  pull: ["lat-pulldown", "barbell-row", "face-pull"],
  core: ["glute-bridge", "plank", "hanging-leg-raise", "cable-crunch"],
};

/** 해당 부위(tone)의 운동 목록을 반환. rest 면 빈 배열. 성별로 분기. */
export function exercisesForFocus(
  tone: FocusTone,
  gender: "male" | "female" = "male",
): CatalogExercise[] {
  if (tone === "rest") return [];
  const ids =
    gender === "female" ? FOCUS_EXERCISES_FEMALE[tone] : FOCUS_EXERCISES[tone];
  return ids.map((id) => EXERCISES[id]);
}

/* ─── 처방(세트×횟수×무게) ──────────────────────────────────────────────── */

export type LoadClass = "heavy" | "medium" | "light" | "bodyweight";

const LOAD_CLASS: Record<string, LoadClass> = {
  squat: "heavy",
  deadlift: "heavy",
  "bench-press": "heavy",
  ohp: "heavy",
  "leg-press": "heavy",
  rdl: "heavy",
  "hip-thrust": "heavy",
  "incline-press": "heavy",
  "barbell-row": "medium",
  "lat-pulldown": "medium",
  "chest-fly": "light",
  "lateral-raise": "light",
  "face-pull": "light",
  "biceps-curl": "light",
  "hammer-curl": "light",
  "triceps-pushdown": "light",
  "leg-curl": "light",
  "cable-crunch": "light",
  "cable-kickback": "light",
  "hip-abduction": "light",
  dips: "bodyweight",
  "pull-up": "bodyweight",
  plank: "bodyweight",
  "hanging-leg-raise": "bodyweight",
  lunge: "bodyweight",
  "bulgarian-split-squat": "bodyweight",
  "glute-bridge": "bodyweight",
};

export function loadClassOf(id: string): LoadClass {
  return LOAD_CLASS[id] ?? "medium";
}

export type Prescription = {
  sets: number;
  reps: number;
  /** 권장 무게(kg). 맨몸 운동이면 null */
  weightKg: number | null;
};

const REPS: Record<
  "beginner" | "intermediate" | "advanced",
  { heavy: number; other: number }
> = {
  beginner: { heavy: 12, other: 15 },
  intermediate: { heavy: 10, other: 12 },
  advanced: { heavy: 6, other: 10 },
};

const SETS = { beginner: 3, intermediate: 4, advanced: 4 } as const;

/** 체중 대비 기본 부하 비율(중급 남성 기준) */
const LOAD_FRACTION: Record<LoadClass, number> = {
  heavy: 0.6,
  medium: 0.4,
  light: 0.15,
  bodyweight: 0,
};

/**
 * 운동 + 체형/성별/경력 → 권장 세트·횟수·무게.
 * 휴리스틱이며 시작점 제안용(이후 사용자가 직접 조정 가능).
 */
export function prescribe(
  exerciseId: string,
  opts: {
    gender: "male" | "female";
    experience: "beginner" | "intermediate" | "advanced";
    bodyType: "lean" | "average" | "heavy";
    weightKg: number;
  },
): Prescription {
  const loadClass = loadClassOf(exerciseId);
  const sets = SETS[opts.experience];
  const reps =
    loadClass === "heavy"
      ? REPS[opts.experience].heavy
      : REPS[opts.experience].other;

  if (loadClass === "bodyweight") {
    return { sets, reps, weightKg: null };
  }

  const expFactor =
    opts.experience === "beginner"
      ? 0.7
      : opts.experience === "advanced"
        ? 1.3
        : 1;
  const genderFactor = opts.gender === "female" ? 0.65 : 1;
  const bodyFactor =
    opts.bodyType === "lean" ? 0.9 : opts.bodyType === "heavy" ? 1.05 : 1;

  const raw =
    opts.weightKg *
    LOAD_FRACTION[loadClass] *
    expFactor *
    genderFactor *
    bodyFactor;

  // 2.5kg 단위로 반올림, 최소 2.5kg
  const weightKg = Math.max(2.5, Math.round(raw / 2.5) * 2.5);
  return { sets, reps, weightKg };
}

/** 전체 운동(슬러그=운동 id) — 운동 종목 리스트용 */
export const ALL_EXERCISES: CatalogExercise[] = Object.values(EXERCISES);

/** 슬러그(=운동 id)로 카탈로그 운동 조회 */
export function getCatalogExercise(
  slug: string,
): CatalogExercise | undefined {
  return EXERCISES[slug];
}

export function isEquipmentId(value: unknown): value is EquipmentId {
  return (
    typeof value === "string" && value in EQUIPMENT_LABELS
  );
}