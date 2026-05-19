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

export const DEFAULT_SPLITS = 3;
export const DEFAULT_VARIANT_ID = "cbl-3";

/* ─── 커스텀 분할 ───────────────────────────────────────────────────────────
 * 사용자가 월~일 7일을 직접 부위 블록으로 채우는 모드.
 * DB 에는 splits=0, variant_id="custom", custom_week=[블록 id ×7] 로 저장하고
 * 서버는 아래 레지스트리의 id 만 신뢰해 DayPlan 을 복원한다(클라이언트가 보낸
 * 부위/예시 텍스트는 신뢰하지 않음).
 */

export const CUSTOM_VARIANT_ID = "custom";
export const CUSTOM_SPLITS = 0;

export type DayBlockId =
  | "rest"
  | "fullbody"
  | "upper"
  | "lower"
  | "chest"
  | "back"
  | "shoulder"
  | "arm"
  | "push"
  | "pull"
  | "core";

/** 커스텀 빌더에서 고를 수 있는 하루 블록 (id → 라벨 + DayPlan) */
export const DAY_BLOCKS: Record<
  DayBlockId,
  { label: string; day: DayPlan }
> = {
  rest: { label: "휴식", day: REST },
  fullbody: { label: "전신", day: FULLBODY },
  upper: { label: "상체", day: UPPER },
  lower: { label: "하체", day: LEG },
  chest: { label: "가슴", day: CHEST },
  back: { label: "등", day: BACK },
  shoulder: { label: "어깨", day: SHOULDER },
  arm: { label: "팔", day: ARM },
  push: { label: "밀기 (Push)", day: PUSH },
  pull: { label: "당기기 (Pull)", day: PULL },
  core: { label: "코어 + 유산소", day: CORE },
};

export const DAY_BLOCK_IDS = Object.keys(DAY_BLOCKS) as DayBlockId[];

/** 비어 있을 때 시작점이 되는 기본 커스텀 주간 (PPL + 휴식) */
export const DEFAULT_CUSTOM_WEEK: DayBlockId[] = [
  "push",
  "pull",
  "lower",
  "rest",
  "push",
  "pull",
  "rest",
];

export function isDayBlockId(value: unknown): value is DayBlockId {
  return typeof value === "string" && value in DAY_BLOCKS;
}

/** 커스텀 주간이 길이 7 + 전부 유효한 블록 id 인지 검증 */
export function isValidCustomWeek(week: unknown): week is DayBlockId[] {
  return (
    Array.isArray(week) && week.length === 7 && week.every(isDayBlockId)
  );
}

/** 블록 id 배열을 카탈로그 변형과 동일한 형태로 복원 */
export function buildCustomVariant(week: DayBlockId[]): RoutineVariant {
  const trainingDays = week.filter((id) => id !== "rest").length;
  return {
    id: CUSTOM_VARIANT_ID,
    name: "커스텀 분할",
    description: `직접 구성한 주 ${trainingDays}회 루틴`,
    week: week.map((id) => DAY_BLOCKS[id].day),
  };
}

const CUSTOM_PRESET_BASE = {
  splits: CUSTOM_SPLITS,
  label: "커스텀",
  tagline: "월~일 7일을 직접 부위별로 채우는 나만의 분할",
};

export type ResolvedRoutine = {
  preset: SplitPreset;
  variant: RoutineVariant;
};

/**
 * splits + variantId 를 프리셋/변형으로 해석. 잘못된 값이면 기본값으로 대체.
 * variantId 가 "custom" 이면 customWeek 로 합성 프리셋/변형을 만든다.
 */
export function resolveRoutine(
  splits: number,
  variantId: string,
  customWeek?: DayBlockId[] | null,
): ResolvedRoutine {
  if (variantId === CUSTOM_VARIANT_ID && isValidCustomWeek(customWeek)) {
    const variant = buildCustomVariant(customWeek);
    return {
      preset: { ...CUSTOM_PRESET_BASE, variants: [variant] },
      variant,
    };
  }

  const preset =
    SPLIT_PRESETS.find((item) => item.splits === splits) ??
    SPLIT_PRESETS.find((item) => item.splits === DEFAULT_SPLITS)!;
  const variant =
    preset.variants.find((item) => item.id === variantId) ??
    preset.variants[0];
  return { preset, variant };
}

/** splits + variantId 조합이 카탈로그에 존재하는지 검증 */
export function isValidRoutine(splits: number, variantId: string): boolean {
  const preset = SPLIT_PRESETS.find((item) => item.splits === splits);
  return Boolean(preset?.variants.some((item) => item.id === variantId));
}

/* ─── 기준일 기반 날짜 매핑 ──────────────────────────────────────────────────
 * 루틴은 요일 고정이 아니라 startDate(기준일)부터 7일 주기로 순환한다.
 * "오늘부터 다시 시작" = 기준일을 오늘로, "오늘 휴식 전환" = 기준일 +1일.
 */

/** 한국(Asia/Seoul) 기준 오늘 날짜를 YYYY-MM-DD 로 반환 */
export function seoulYmd(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function ymdToEpochDay(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** anchor(YYYY-MM-DD) 대비 date 의 7일 주기 오프셋(0~6) */
export function routineDayOffset(anchorYmd: string, dateYmd: string): number {
  const diff = ymdToEpochDay(dateYmd) - ymdToEpochDay(anchorYmd);
  return ((diff % 7) + 7) % 7;
}

/** YYYY-MM-DD 에 일수를 더한 YYYY-MM-DD */
export function addDaysYmd(ymd: string, days: number): string {
  const dt = new Date((ymdToEpochDay(ymd) + days) * 86_400_000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD → { weekday: "월"~"일", label: "5/19" } */
export function ymdDisplay(ymd: string): { weekday: Weekday; label: string } {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const jsDay = dt.getUTCDay(); // 0=일
  const index = jsDay === 0 ? 6 : jsDay - 1; // 0=월
  return { weekday: WEEKDAYS[index], label: `${m}/${d}` };
}