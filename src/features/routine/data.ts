export const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type FocusTone =
  | "fullbody"
  | "upper"
  | "lower"
  | "chest"
  | "back"
  | "shoulder"
  | "arm"
  | "push"
  | "pull"
  | "core"
  | "rest";

export type DayPlan = {
  /** 카드에 표시되는 라벨 (예: "가슴", "휴식") */
  focus: string;
  tone: FocusTone;
  /** 주요 자극 부위 */
  muscles: string[];
  /** 대표 운동 예시 */
  examples: string[];
};

export type RoutineVariant = {
  id: string;
  name: string;
  description: string;
  /** 월~일 7일 계획 */
  week: DayPlan[];
};

export type SplitPreset = {
  splits: number;
  label: string;
  tagline: string;
  variants: RoutineVariant[];
};

/** 톤별 색상 (Tailwind 정적 클래스 — 동적 조합 금지) */
export const TONE_STYLES: Record<
  FocusTone,
  { card: string; badge: string; dot: string }
> = {
  fullbody: {
    card: "border-violet-200 bg-violet-50",
    badge: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
  },
  upper: {
    card: "border-sky-200 bg-sky-50",
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500",
  },
  lower: {
    card: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  chest: {
    card: "border-rose-200 bg-rose-50",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
  },
  back: {
    card: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  shoulder: {
    card: "border-cyan-200 bg-cyan-50",
    badge: "bg-cyan-100 text-cyan-700",
    dot: "bg-cyan-500",
  },
  arm: {
    card: "border-fuchsia-200 bg-fuchsia-50",
    badge: "bg-fuchsia-100 text-fuchsia-700",
    dot: "bg-fuchsia-500",
  },
  push: {
    card: "border-rose-200 bg-rose-50",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
  },
  pull: {
    card: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  core: {
    card: "border-indigo-200 bg-indigo-50",
    badge: "bg-indigo-100 text-indigo-700",
    dot: "bg-indigo-500",
  },
  rest: {
    card: "border-zinc-200 bg-zinc-50",
    badge: "bg-zinc-100 text-zinc-500",
    dot: "bg-zinc-300",
  },
};

/* 재사용 가능한 부위 블록 */

const REST: DayPlan = { focus: "휴식", tone: "rest", muscles: [], examples: [] };

const FULLBODY: DayPlan = {
  focus: "전신",
  tone: "fullbody",
  muscles: ["가슴", "등", "하체", "어깨"],
  examples: ["스쿼트", "벤치프레스", "바벨로우"],
};

const UPPER: DayPlan = {
  focus: "상체",
  tone: "upper",
  muscles: ["가슴", "등", "어깨", "팔"],
  examples: ["벤치프레스", "바벨로우", "오버헤드프레스"],
};

const LOWER: DayPlan = {
  focus: "하체",
  tone: "lower",
  muscles: ["대퇴사두", "둔근", "햄스트링"],
  examples: ["스쿼트", "루마니안 데드리프트", "레그프레스"],
};

const CHEST: DayPlan = {
  focus: "가슴",
  tone: "chest",
  muscles: ["대흉근", "삼두", "전면 삼각근"],
  examples: ["벤치프레스", "인클라인 프레스", "딥스"],
};

const BACK: DayPlan = {
  focus: "등",
  tone: "back",
  muscles: ["광배근", "승모근", "이두"],
  examples: ["데드리프트", "바벨로우", "랫풀다운"],
};

const SHOULDER: DayPlan = {
  focus: "어깨",
  tone: "shoulder",
  muscles: ["삼각근", "승모근"],
  examples: ["오버헤드프레스", "사이드 레터럴 레이즈", "페이스풀"],
};

const ARM: DayPlan = {
  focus: "팔",
  tone: "arm",
  muscles: ["이두", "삼두", "전완"],
  examples: ["바벨컬", "케이블 푸시다운", "해머컬"],
};

const LEG: DayPlan = {
  focus: "하체",
  tone: "lower",
  muscles: ["대퇴사두", "둔근", "햄스트링", "종아리"],
  examples: ["스쿼트", "레그프레스", "레그컬"],
};

const PUSH: DayPlan = {
  focus: "밀기 (Push)",
  tone: "push",
  muscles: ["가슴", "어깨", "삼두"],
  examples: ["벤치프레스", "오버헤드프레스", "딥스"],
};

const PULL: DayPlan = {
  focus: "당기기 (Pull)",
  tone: "pull",
  muscles: ["등", "이두", "후면 삼각근"],
  examples: ["데드리프트", "바벨로우", "랫풀다운"],
};

const CHEST_TRI: DayPlan = {
  focus: "가슴 + 삼두",
  tone: "chest",
  muscles: ["대흉근", "삼두"],
  examples: ["벤치프레스", "인클라인 프레스", "케이블 푸시다운"],
};

const BACK_BI: DayPlan = {
  focus: "등 + 이두",
  tone: "back",
  muscles: ["광배근", "이두"],
  examples: ["바벨로우", "랫풀다운", "바벨컬"],
};

const CORE: DayPlan = {
  focus: "코어 + 유산소",
  tone: "core",
  muscles: ["복근", "유산소"],
  examples: ["플랭크", "행잉 레그레이즈", "러닝"],
};

export const SPLIT_PRESETS: SplitPreset[] = [
  {
    splits: 1,
    label: "무분할",
    tagline: "전신을 한 번에 — 입문/시간 부족할 때",
    variants: [
      {
        id: "fullbody-3",
        name: "전신 (주 3회)",
        description: "하루에 전신을 모두 자극, 회복일을 충분히 확보",
        week: [FULLBODY, REST, FULLBODY, REST, FULLBODY, REST, REST],
      },
    ],
  },
  {
    splits: 2,
    label: "2분할",
    tagline: "상·하체 또는 밀기·당기기로 둘로 나누기",
    variants: [
      {
        id: "upper-lower",
        name: "상체 / 하체",
        description: "가장 무난한 2분할, 주 4회",
        week: [UPPER, LOWER, REST, UPPER, LOWER, REST, REST],
      },
      {
        id: "push-pull",
        name: "밀기 / 당기기",
        description: "미는 동작과 당기는 동작으로 구분",
        week: [PUSH, PULL, REST, PUSH, PULL, REST, REST],
      },
    ],
  },
  {
    splits: 3,
    label: "3분할",
    tagline: "가슴·등·하체 / PPL 등으로 셋으로 나누기",
    variants: [
      {
        id: "cbl-3",
        name: "가슴 · 등 · 하체 (주 3회)",
        description: "부위별 회복을 넉넉히 두는 클래식 3분할",
        week: [CHEST, REST, BACK, REST, LEG, REST, REST],
      },
      {
        id: "ppl-6",
        name: "Push · Pull · Legs (주 6회)",
        description: "PPL을 주 2사이클, 일요일 휴식",
        week: [PUSH, PULL, LEG, PUSH, PULL, LEG, REST],
      },
    ],
  },
  {
    splits: 4,
    label: "4분할",
    tagline: "가슴·등·어깨·하체로 더 세밀하게",
    variants: [
      {
        id: "cbsl-4",
        name: "가슴 · 등 · 어깨 · 하체",
        description: "부위별 집중도를 높이는 주 4회",
        week: [CHEST, BACK, SHOULDER, LEG, REST, REST, REST],
      },
      {
        id: "ct-bb-4",
        name: "가슴+삼두 · 등+이두 · 어깨 · 하체",
        description: "관절 움직임이 비슷한 부위를 묶은 4분할",
        week: [CHEST_TRI, BACK_BI, SHOULDER, LEG, REST, REST, REST],
      },
    ],
  },
  {
    splits: 5,
    label: "5분할",
    tagline: "부위별로 하루씩 — 보디빌딩 스타일",
    variants: [
      {
        id: "bro-5",
        name: "가슴 · 등 · 어깨 · 팔 · 하체",
        description: "한 부위에 집중하는 브로 스플릿, 주 5회",
        week: [CHEST, BACK, SHOULDER, ARM, LEG, REST, REST],
      },
      {
        id: "bro-5-alt",
        name: "가슴 · 등 · 하체 · 어깨 · 팔",
        description: "큰 근육을 주 초반에 배치한 변형",
        week: [CHEST, BACK, LEG, SHOULDER, ARM, REST, REST],
      },
    ],
  },
  {
    splits: 6,
    label: "6분할",
    tagline: "거의 매일 운동하는 고볼륨 루틴",
    variants: [
      {
        id: "ppl-x2",
        name: "Push · Pull · Legs ×2",
        description: "PPL 2사이클, 일요일만 휴식",
        week: [PUSH, PULL, LEG, PUSH, PULL, LEG, REST],
      },
      {
        id: "six-part",
        name: "가슴·등·어깨·팔·하체·코어",
        description: "부위를 잘게 쪼갠 주 6회 루틴",
        week: [CHEST, BACK, SHOULDER, ARM, LEG, CORE, REST],
      },
    ],
  },
];