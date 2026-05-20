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

  /* ─── 가슴 추가 ─────────────────────────────────────────────────────── */
  "decline-press": {
    id: "decline-press",
    name: "디클라인 벤치프레스",
    target: "하부 대흉근 · 삼두",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "벤치 각도 -15~-30도, 발 잡고 고정",
          "바를 가슴 하부로 내리며 팔꿈치 45도",
          "가슴 하부로 끝까지 밀어 올리기",
        ],
      },
      {
        equipment: "dumbbell",
        method: [
          "덤벨을 가슴 하부 옆에서 시작",
          "가슴 모아 위로 모아 올리기",
          "통제하며 깊이 내리기",
        ],
      },
      {
        equipment: "machine",
        method: [
          "시트 조절로 손잡이를 가슴 하부 높이에",
          "끝까지 밀고 천천히 복귀",
          "반동 없이 일정 속도 유지",
        ],
      },
    ],
  },
  "push-up": {
    id: "push-up",
    name: "푸시업",
    target: "대흉근 · 삼두 · 코어",
    equipments: [
      {
        equipment: "bodyweight",
        method: [
          "손은 어깨 약간 넓게, 몸을 일직선",
          "팔꿈치 45도로 가슴이 바닥 가까이",
          "가슴·삼두로 밀어 올리며 코어 고정",
        ],
      },
    ],
  },
  "pec-deck": {
    id: "pec-deck",
    name: "펙덱 플라이",
    target: "대흉근(모음)",
    equipments: [
      {
        equipment: "machine",
        method: [
          "팔뚝/팔꿈치를 패드에 대고 시트 조절",
          "팔꿈치 각 유지하며 가슴 앞에서 모으기",
          "정점 1초 수축 후 통제 복귀",
        ],
      },
    ],
  },
  "cable-crossover": {
    id: "cable-crossover",
    name: "케이블 크로스오버",
    target: "대흉근(모음·하부)",
    equipments: [
      {
        equipment: "cable",
        method: [
          "고/중간 도르래에 D-그립, 한 발 앞으로",
          "팔꿈치 각 유지하며 배꼽 앞에서 교차",
          "정점 수축 후 천천히 복귀",
        ],
      },
    ],
  },
  "close-grip-bench-press": {
    id: "close-grip-bench-press",
    name: "클로즈그립 벤치프레스",
    target: "삼두 · 내측 대흉근",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "어깨너비보다 좁게, 손목 부담 없는 폭",
          "팔꿈치 옆구리 가까이 유지하며 내리기",
          "삼두로 끝까지 밀어 올리기",
        ],
      },
    ],
  },

  /* ─── 등 추가 ───────────────────────────────────────────────────────── */
  "t-bar-row": {
    id: "t-bar-row",
    name: "티바 로우",
    target: "광배 · 능형근 · 승모",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "바 끝을 코너에 고정, 다리 사이로 잡기",
          "힙 힌지로 상체 45도 숙이고 등 펴기",
          "팔꿈치 뒤로 빼며 가슴까지 당기기",
        ],
      },
      {
        equipment: "machine",
        method: [
          "가슴 패드에 밀착, 발판에 안정적으로 서기",
          "팔꿈치 뒤로 빼며 견갑 모으기",
          "반동 없이 통제 복귀",
        ],
      },
    ],
  },
  "seated-cable-row": {
    id: "seated-cable-row",
    name: "시티드 케이블 로우",
    target: "광배 중부 · 능형근",
    equipments: [
      {
        equipment: "cable",
        method: [
          "발판에 발 고정, 무릎 살짝 굽히기",
          "상체 세우고 배꼽 쪽으로 당기기",
          "견갑 모은 후 통제하며 복귀",
        ],
      },
    ],
  },
  "one-arm-dumbbell-row": {
    id: "one-arm-dumbbell-row",
    name: "원암 덤벨 로우",
    target: "광배 · 능형근",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "벤치에 한 손·한 무릎 지지, 등 평평",
          "덤벨을 골반 쪽으로 당기며 팔꿈치 뒤",
          "광배 수축 후 통제 복귀",
        ],
      },
    ],
  },
  "straight-arm-pulldown": {
    id: "straight-arm-pulldown",
    name: "스트레이트암 풀다운",
    target: "광배(하부)",
    equipments: [
      {
        equipment: "cable",
        method: [
          "스트레이트 바, 고 도르래, 살짝 숙이기",
          "팔꿈치 살짝 굽혀 고정",
          "팔로 호를 그리며 허벅지까지 끌어내리기",
        ],
      },
    ],
  },
  shrug: {
    id: "shrug",
    name: "슈러그",
    target: "상승모",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "바를 허벅지 앞에서 잡고 팔을 길게",
          "어깨를 귀 쪽으로 끌어올리기",
          "정점 1초 후 통제 하강",
        ],
      },
      {
        equipment: "dumbbell",
        method: [
          "덤벨 양손에 길게 잡기",
          "어깨만 위로 끌어올리고 회전 금지",
          "천천히 내리기",
        ],
      },
    ],
  },
  "chin-up": {
    id: "chin-up",
    name: "친업",
    target: "광배 · 이두",
    equipments: [
      {
        equipment: "bodyweight",
        method: [
          "언더그립 어깨너비, 견갑 하강",
          "턱이 바 위로 올라오게 당기기",
          "통제하며 완전히 펴기",
        ],
      },
    ],
  },
  hyperextension: {
    id: "hyperextension",
    name: "하이퍼익스텐션",
    target: "척추기립근 · 둔근",
    equipments: [
      {
        equipment: "machine",
        method: [
          "발 고정, 패드를 골반에 위치",
          "등을 둥글지 않게 펴고 상체 일직선까지",
          "허리 과신전 없이 통제 복귀",
        ],
      },
      {
        equipment: "bodyweight",
        method: [
          "등 펴고 천천히 상체 숙이기",
          "둔근·기립근으로 일직선까지 들기",
          "리듬보다 통제",
        ],
      },
    ],
  },

  /* ─── 어깨 추가 ─────────────────────────────────────────────────────── */
  "arnold-press": {
    id: "arnold-press",
    name: "아놀드 프레스",
    target: "전·측면 삼각근",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "덤벨 손바닥이 몸 쪽으로 보이게 시작",
          "회전하며 위로 밀어 올리며 손바닥 정면으로",
          "내릴 때 역순으로 회전",
        ],
      },
    ],
  },
  "front-raise": {
    id: "front-raise",
    name: "프론트 레이즈",
    target: "전면 삼각근",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "덤벨을 허벅지 앞에서 시작",
          "팔꿈치 살짝 굽혀 어깨 높이까지 들기",
          "반동 없이 통제 하강",
        ],
      },
      {
        equipment: "cable",
        method: [
          "낮은 도르래, 한 손 또는 양손",
          "팔꿈치 각 유지하며 어깨 높이까지",
          "장력 유지하며 복귀",
        ],
      },
      {
        equipment: "barbell",
        method: [
          "바를 허벅지 앞에서 잡기",
          "어깨 높이까지 들고 호 그리기",
          "팔꿈치 잠금 없이 통제",
        ],
      },
    ],
  },
  "rear-delt-fly": {
    id: "rear-delt-fly",
    name: "리어 델트 플라이",
    target: "후면 삼각근",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "상체 숙여 등 평평, 팔꿈치 살짝 굽힘",
          "양옆·뒤로 호를 그리며 견갑 모으기",
          "어깨 으쓱 없이 후면 삼각근 집중",
        ],
      },
      {
        equipment: "machine",
        method: [
          "가슴 패드에 밀착, 시트 조절",
          "팔로 뒤로 호를 그리며 견갑 모으기",
          "정점 1초 정지 후 통제 복귀",
        ],
      },
      {
        equipment: "cable",
        method: [
          "양 도르래 교차로 D-그립 잡기",
          "팔꿈치 각 유지하며 뒤·옆으로",
          "장력 유지하며 복귀",
        ],
      },
    ],
  },
  "upright-row": {
    id: "upright-row",
    name: "업라이트 로우",
    target: "측면 삼각근 · 승모",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "어깨너비 또는 그보다 약간 넓게 잡기",
          "팔꿈치를 가슴 높이까지 끌어올리기",
          "어깨 부담 시 가동범위 줄이기",
        ],
      },
      {
        equipment: "dumbbell",
        method: [
          "덤벨을 허벅지 앞에서 잡기",
          "팔꿈치를 어깨 높이까지",
          "통제하며 천천히 내리기",
        ],
      },
      {
        equipment: "cable",
        method: [
          "낮은 도르래에 직선바",
          "팔꿈치 리딩으로 가슴 높이까지",
          "정점에서 1초 정지",
        ],
      },
    ],
  },

  /* ─── 팔 추가 ───────────────────────────────────────────────────────── */
  "preacher-curl": {
    id: "preacher-curl",
    name: "프리처 컬",
    target: "이두(하부)",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "프리처 벤치에 팔 안쪽 밀착",
          "팔꿈치 고정하고 완전 신전~수축",
          "내릴 때 통제 (잠금 직전까지)",
        ],
      },
      {
        equipment: "dumbbell",
        method: [
          "한 팔씩 또는 양팔, 팔 안쪽 패드 밀착",
          "팔꿈치 고정하고 수축",
          "통제 하강",
        ],
      },
      {
        equipment: "machine",
        method: [
          "시트·패드 조절, 손잡이 잡기",
          "이두만으로 끌어올려 1초 수축",
          "반동 없이 복귀",
        ],
      },
    ],
  },
  "ez-bar-curl": {
    id: "ez-bar-curl",
    name: "이지바 컬",
    target: "이두",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "EZ바 내측 그립으로 잡기",
          "팔꿈치 옆구리 고정 후 컬",
          "반동 없이 끝까지 펴며 내리기",
        ],
      },
    ],
  },
  "incline-curl": {
    id: "incline-curl",
    name: "인클라인 덤벨 컬",
    target: "이두(장두)",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "인클라인 벤치에 등 기대고 팔 늘어뜨리기",
          "팔꿈치 뒤로 고정한 채 컬",
          "장두 늘림 강조하며 통제 하강",
        ],
      },
    ],
  },
  "concentration-curl": {
    id: "concentration-curl",
    name: "컨센트레이션 컬",
    target: "이두 단두",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "벤치에 앉아 팔꿈치를 허벅지 안쪽에 고정",
          "이두만으로 끌어올려 1초 수축",
          "통제하며 완전히 펴기",
        ],
      },
    ],
  },
  "skull-crusher": {
    id: "skull-crusher",
    name: "라잉 트라이셉스 익스텐션",
    target: "삼두 장두",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "EZ바, 누워서 팔 수직",
          "팔꿈치 고정하고 이마 위로 내리기",
          "삼두로 밀어 올리되 어깨 닫지 않기",
        ],
      },
      {
        equipment: "dumbbell",
        method: [
          "덤벨 양손에 잡고 팔 수직",
          "팔꿈치 고정, 머리 옆으로 내리기",
          "삼두 수축으로 복귀",
        ],
      },
    ],
  },
  "overhead-triceps-extension": {
    id: "overhead-triceps-extension",
    name: "오버헤드 트라이셉스 익스텐션",
    target: "삼두 장두",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "덤벨 한 개를 양손으로 잡고 머리 위로",
          "팔꿈치 고정한 채 뒤로 내리기",
          "삼두로 펴며 위로",
        ],
      },
      {
        equipment: "cable",
        method: [
          "로프 잡고 등지고 서서 팔 머리 위",
          "팔꿈치 고정하고 뒤에서 위로 펴기",
          "수축 1초 후 복귀",
        ],
      },
    ],
  },
  "bench-dip": {
    id: "bench-dip",
    name: "벤치 딥",
    target: "삼두",
    equipments: [
      {
        equipment: "bodyweight",
        method: [
          "벤치 모서리 잡고 엉덩이 앞으로",
          "팔꿈치 90도까지 내리기",
          "삼두로 밀어 올리되 어깨 으쓱 금지",
        ],
      },
    ],
  },
  "reverse-curl": {
    id: "reverse-curl",
    name: "리버스 컬",
    target: "전완 · 이두 단두",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "오버그립으로 EZ바 잡기",
          "팔꿈치 고정한 채 컬",
          "통제 하강, 손목 곧게",
        ],
      },
      {
        equipment: "dumbbell",
        method: [
          "오버그립 덤벨 양손",
          "팔꿈치 고정 후 컬",
          "전완 자극에 집중",
        ],
      },
    ],
  },
  "wrist-curl": {
    id: "wrist-curl",
    name: "리스트 컬",
    target: "전완 굴근",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "팔뚝을 벤치에 얹고 손바닥이 위로",
          "손목만 굽혀 끌어올리기",
          "통제하며 완전히 펴기",
        ],
      },
      {
        equipment: "barbell",
        method: [
          "바를 양손 손바닥 위로, 팔뚝 벤치 위",
          "손목만 굽혀 끌어올리기",
          "천천히 펴기",
        ],
      },
    ],
  },

  /* ─── 하체 추가 ─────────────────────────────────────────────────────── */
  "front-squat": {
    id: "front-squat",
    name: "프론트 스쿼트",
    target: "대퇴사두 · 코어",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "바를 쇄골 위 랙 포지션, 팔꿈치 높게",
          "코어 단단히, 평행까지 앉기",
          "상체 세운 채 발 전체로 일어서기",
        ],
      },
    ],
  },
  "goblet-squat": {
    id: "goblet-squat",
    name: "고블릿 스쿼트",
    target: "대퇴사두 · 둔근",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "덤벨을 가슴 앞에 컵 모양으로 잡기",
          "팔꿈치가 무릎 안쪽에 닿을 만큼 앉기",
          "발 전체로 밀어 일어서기",
        ],
      },
    ],
  },
  "hack-squat": {
    id: "hack-squat",
    name: "핵 스쿼트",
    target: "대퇴사두 · 둔근",
    equipments: [
      {
        equipment: "machine",
        method: [
          "어깨 패드·발판에 안정적으로 위치",
          "허리 시트 밀착 유지하며 깊게 내리기",
          "발 전체로 밀어 올리기",
        ],
      },
    ],
  },
  "leg-extension": {
    id: "leg-extension",
    name: "레그 익스텐션",
    target: "대퇴사두",
    equipments: [
      {
        equipment: "machine",
        method: [
          "발목 패드를 발등 아래에 위치",
          "무릎 완전 펴며 정점 1초 수축",
          "반동 없이 통제 복귀",
        ],
      },
    ],
  },
  "seated-leg-curl": {
    id: "seated-leg-curl",
    name: "시티드 레그컬",
    target: "햄스트링",
    equipments: [
      {
        equipment: "machine",
        method: [
          "허리 패드 밀착, 발목 패드 위치 조절",
          "햄스트링으로 끝까지 굽히기",
          "반동 없이 통제 복귀",
        ],
      },
    ],
  },
  "standing-calf-raise": {
    id: "standing-calf-raise",
    name: "스탠딩 카프 레이즈",
    target: "비복근",
    equipments: [
      {
        equipment: "machine",
        method: [
          "어깨 패드 받치고 발 앞꿈치를 발판에",
          "발끝으로 끝까지 들고 1초 정지",
          "발뒤꿈치 깊게 내려 스트레치",
        ],
      },
      {
        equipment: "bodyweight",
        method: [
          "계단 끝에 발 앞꿈치, 한 손 지지",
          "발끝으로 끝까지 들기",
          "발뒤꿈치 깊게 내려 통제",
        ],
      },
    ],
  },
  "seated-calf-raise": {
    id: "seated-calf-raise",
    name: "시티드 카프 레이즈",
    target: "가자미근",
    equipments: [
      {
        equipment: "machine",
        method: [
          "패드를 무릎 위에, 발 앞꿈치 발판에",
          "발끝으로 끝까지 들기",
          "정점 1초 후 통제 하강",
        ],
      },
    ],
  },
  "sumo-deadlift": {
    id: "sumo-deadlift",
    name: "스모 데드리프트",
    target: "둔근 · 내전근 · 햄스트링",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "발 어깨보다 넓게, 발끝 45도",
          "바를 발 중앙, 안쪽 그립",
          "엉덩이·가슴 동시에 세우며 발로 밀기",
        ],
      },
    ],
  },
  "good-morning": {
    id: "good-morning",
    name: "굿모닝",
    target: "햄스트링 · 척추기립근",
    equipments: [
      {
        equipment: "barbell",
        method: [
          "바를 승모근 위에 안전하게",
          "무릎 살짝 굽힌 채 힙 힌지",
          "둔근 수축하며 상체 세우기",
        ],
      },
    ],
  },
  "step-up": {
    id: "step-up",
    name: "스텝업",
    target: "대퇴사두 · 둔근",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "덤벨 양손에 들고 박스에 한 발",
          "앞발로 밀어 올라서기 (뒷발 반동 금지)",
          "통제하며 내려오기",
        ],
      },
      {
        equipment: "bodyweight",
        method: [
          "박스 위에 한 발 디디기",
          "앞발로 밀어 올라가 다른 발 들기",
          "천천히 내려오며 균형 유지",
        ],
      },
    ],
  },
  "hip-adduction": {
    id: "hip-adduction",
    name: "힙 어덕션",
    target: "내전근",
    equipments: [
      {
        equipment: "machine",
        method: [
          "패드 안쪽에 무릎 대고 다리 벌린 상태",
          "내전근으로 다리 모으기",
          "통제 복귀",
        ],
      },
    ],
  },
  "walking-lunge": {
    id: "walking-lunge",
    name: "워킹 런지",
    target: "대퇴사두 · 둔근",
    equipments: [
      {
        equipment: "dumbbell",
        method: [
          "덤벨 양손에 길게 들기",
          "한 발 크게 디뎌 뒤 무릎이 바닥 가까이",
          "앞발로 밀며 다음 보 연속",
        ],
      },
      {
        equipment: "bodyweight",
        method: [
          "상체 세우고 한 발 크게 앞으로",
          "양 무릎 90도까지 내리기",
          "앞발로 밀며 다음 보",
        ],
      },
    ],
  },
  "smith-squat": {
    id: "smith-squat",
    name: "스미스 머신 스쿼트",
    target: "대퇴사두 · 둔근",
    equipments: [
      {
        equipment: "machine",
        method: [
          "발 위치를 살짝 앞으로 두어 무릎 부담 줄이기",
          "허리 중립, 평행까지 내리기",
          "발 전체로 밀어 올리며 무릎 잠금 회피",
        ],
      },
    ],
  },

  /* ─── 코어 추가 ─────────────────────────────────────────────────────── */
  "sit-up": {
    id: "sit-up",
    name: "싯업",
    target: "복근",
    equipments: [
      {
        equipment: "bodyweight",
        method: [
          "무릎 굽히고 발 고정, 손은 가슴 또는 머리 옆",
          "복근으로 상체 들어 무릎 쪽으로",
          "통제하며 천천히 내리기",
        ],
      },
    ],
  },
  crunch: {
    id: "crunch",
    name: "크런치",
    target: "상복근",
    equipments: [
      {
        equipment: "bodyweight",
        method: [
          "무릎 굽혀 눕고 손은 가슴 또는 관자놀이",
          "복근만 말아 상체 살짝 들기",
          "정점 1초 후 통제 하강",
        ],
      },
    ],
  },
  "side-plank": {
    id: "side-plank",
    name: "사이드 플랭크",
    target: "복사근",
    equipments: [
      {
        equipment: "bodyweight",
        method: [
          "팔꿈치 어깨 아래, 옆으로 몸 일직선",
          "엉덩이 떨어지지 않게 코어 유지",
          "30~60초 유지 후 반대쪽",
        ],
      },
    ],
  },
  "russian-twist": {
    id: "russian-twist",
    name: "러시안 트위스트",
    target: "복사근",
    equipments: [
      {
        equipment: "bodyweight",
        method: [
          "무릎 굽히고 발 들기, 상체 살짝 뒤로",
          "양옆으로 손을 바닥 가깝게 회전",
          "허리 비틀지 않고 복부 회전",
        ],
      },
      {
        equipment: "dumbbell",
        method: [
          "덤벨 한 개를 양손에 잡기",
          "코어 유지한 채 좌우 회전",
          "통제하며 일정 속도",
        ],
      },
    ],
  },
  "ab-rollout": {
    id: "ab-rollout",
    name: "앱 휠 롤아웃",
    target: "복근 · 코어",
    equipments: [
      {
        equipment: "bodyweight",
        method: [
          "무릎 꿇고 휠을 어깨 아래에",
          "허리 처지지 않게 천천히 굴려 늘리기",
          "복근·광배로 끌어당겨 복귀",
        ],
      },
    ],
  },
  "mountain-climber": {
    id: "mountain-climber",
    name: "마운틴 클라이머",
    target: "코어 · 심폐",
    equipments: [
      {
        equipment: "bodyweight",
        method: [
          "플랭크 자세, 손 어깨 아래",
          "무릎을 가슴 쪽으로 빠르게 번갈아",
          "엉덩이 들리지 않게 유지",
        ],
      },
    ],
  },
  "wood-chopper": {
    id: "wood-chopper",
    name: "우드 차퍼",
    target: "복사근 · 코어",
    equipments: [
      {
        equipment: "cable",
        method: [
          "고 도르래, 옆으로 서서 양손 잡기",
          "대각선 아래·반대편으로 끌어내리기",
          "팔 아닌 몸통(코어) 회전",
        ],
      },
    ],
  },
  "pallof-press": {
    id: "pallof-press",
    name: "팰로프 프레스",
    target: "코어(안티 회전)",
    equipments: [
      {
        equipment: "cable",
        method: [
          "가슴 높이 도르래, 옆으로 서서 손잡이 잡기",
          "가슴 앞으로 밀어 펴기 (회전 저항)",
          "통제하며 복귀, 좌우 균형",
        ],
      },
    ],
  },
};

export type FocusKey = Exclude<FocusTone, "rest">;

/** 부위 → 운동 id 목록 (남성 기본) */
const FOCUS_EXERCISES: Record<FocusKey, string[]> = {
  fullbody: ["squat", "bench-press", "barbell-row"],
  upper: ["bench-press", "barbell-row", "ohp"],
  lower: ["squat", "rdl", "leg-press", "leg-curl", "leg-extension", "standing-calf-raise"],
  chest: ["bench-press", "incline-press", "chest-fly", "dips", "push-up"],
  back: ["deadlift", "barbell-row", "lat-pulldown", "pull-up", "seated-cable-row", "shrug"],
  shoulder: ["ohp", "lateral-raise", "face-pull", "rear-delt-fly", "front-raise"],
  arm: ["biceps-curl", "hammer-curl", "triceps-pushdown", "ez-bar-curl", "skull-crusher"],
  push: ["bench-press", "ohp", "dips", "skull-crusher"],
  pull: ["deadlift", "barbell-row", "lat-pulldown", "seated-cable-row"],
  core: ["plank", "hanging-leg-raise", "cable-crunch", "side-plank", "sit-up"],
};

/** 부위 → 운동 id 목록 (여성: 둔근·하체·코어 강조) */
const FOCUS_EXERCISES_FEMALE: Record<FocusKey, string[]> = {
  fullbody: ["squat", "hip-thrust", "barbell-row"],
  upper: ["lat-pulldown", "chest-fly", "lateral-raise"],
  lower: [
    "hip-thrust",
    "squat",
    "lunge",
    "bulgarian-split-squat",
    "leg-curl",
    "goblet-squat",
    "step-up",
  ],
  chest: ["incline-press", "chest-fly", "dips", "pec-deck"],
  back: ["lat-pulldown", "barbell-row", "face-pull", "seated-cable-row"],
  shoulder: ["lateral-raise", "ohp", "face-pull", "rear-delt-fly"],
  arm: ["biceps-curl", "triceps-pushdown", "hammer-curl", "preacher-curl"],
  push: ["incline-press", "ohp", "chest-fly"],
  pull: ["lat-pulldown", "barbell-row", "face-pull"],
  core: [
    "glute-bridge",
    "plank",
    "hanging-leg-raise",
    "cable-crunch",
    "side-plank",
    "russian-twist",
  ],
};

/** 운동이 정의된 모든 부위(rest 제외) */
export const ALL_FOCUSES = Object.keys(FOCUS_EXERCISES) as FocusKey[];

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
  // 기본
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
  // 가슴 추가
  "decline-press": "heavy",
  "push-up": "bodyweight",
  "pec-deck": "light",
  "cable-crossover": "light",
  "close-grip-bench-press": "medium",
  // 등 추가
  "t-bar-row": "heavy",
  "seated-cable-row": "medium",
  "one-arm-dumbbell-row": "medium",
  "straight-arm-pulldown": "light",
  shrug: "medium",
  "chin-up": "bodyweight",
  hyperextension: "bodyweight",
  // 어깨 추가
  "arnold-press": "medium",
  "front-raise": "light",
  "rear-delt-fly": "light",
  "upright-row": "light",
  // 팔 추가
  "preacher-curl": "light",
  "ez-bar-curl": "light",
  "incline-curl": "light",
  "concentration-curl": "light",
  "skull-crusher": "medium",
  "overhead-triceps-extension": "light",
  "bench-dip": "bodyweight",
  "reverse-curl": "light",
  "wrist-curl": "light",
  // 하체 추가
  "front-squat": "heavy",
  "goblet-squat": "medium",
  "hack-squat": "heavy",
  "leg-extension": "light",
  "seated-leg-curl": "light",
  "standing-calf-raise": "light",
  "seated-calf-raise": "light",
  "sumo-deadlift": "heavy",
  "good-morning": "medium",
  "step-up": "light",
  "hip-adduction": "light",
  "walking-lunge": "bodyweight",
  "smith-squat": "heavy",
  // 코어 추가
  "sit-up": "bodyweight",
  crunch: "bodyweight",
  "side-plank": "bodyweight",
  "russian-twist": "bodyweight",
  "ab-rollout": "bodyweight",
  "mountain-climber": "bodyweight",
  "wood-chopper": "light",
  "pallof-press": "light",
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

/**
 * 운동 종목 리스트(/exercises) 그룹용 1차 부위 매핑.
 * 단일 부위로 노출하기 위해 가장 대표적인 부위 하나만 지정.
 * (fullbody/upper/push/pull 같은 “세션 그룹”은 제외)
 */
export type BodyPart = "chest" | "back" | "shoulder" | "arm" | "lower" | "core";

export const BODY_PART_LABEL: Record<BodyPart, string> = {
  chest: "가슴",
  back: "등",
  shoulder: "어깨",
  arm: "팔",
  lower: "하체",
  core: "코어",
};

export const BODY_PART_ORDER: BodyPart[] = [
  "chest",
  "back",
  "shoulder",
  "arm",
  "lower",
  "core",
];

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
};

export function primaryBodyPart(id: string): BodyPart {
  return PRIMARY_BODY_PART[id] ?? "core";
}

/** 부위별로 그룹핑한 카탈로그 — /exercises 페이지에서 사용 */
export function groupedByBodyPart(): Record<BodyPart, CatalogExercise[]> {
  const grouped: Record<BodyPart, CatalogExercise[]> = {
    chest: [],
    back: [],
    shoulder: [],
    arm: [],
    lower: [],
    core: [],
  };
  for (const ex of ALL_EXERCISES) {
    grouped[primaryBodyPart(ex.id)].push(ex);
  }
  return grouped;
}

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