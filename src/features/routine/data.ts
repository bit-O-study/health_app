export const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/**
 * 루틴 슬롯 표시 라벨. 루틴은 anchor 기준 7일 주기라 실제 요일이 아니라
 * "주기 N일차" 개념. UI 에서 월/화/수 대신 1일/2일/3일 로 표시.
 */
export const DAY_LABELS = [
  "1일",
  "2일",
  "3일",
  "4일",
  "5일",
  "6일",
  "7일",
] as const;
export type DayLabel = (typeof DAY_LABELS)[number];

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
  /** 카드에 표시되는 라벨 (예:"가슴","휴식","가슴 + 팔") */
  focus: string;
  tone: FocusTone;
  /**
   * 멀티 부위 일자(예: 가슴+팔)면 모든 톤이 들어있다.
   * 단일 부위면 [tone] 과 동일. rest 일이면 ["rest"].
   * 본운동 페치·운동 등록 페이지 그룹핑은 이 값을 사용.
   */
  tones?: FocusTone[];
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
    card: "border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40",
    badge:
      "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  upper: {
    card: "border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40",
    badge: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  lower: {
    card: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40",
    badge:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  chest: {
    card: "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40",
    badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  back: {
    card: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40",
    badge:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  shoulder: {
    card: "border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/40",
    badge: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
    dot: "bg-cyan-500",
  },
  arm: {
    card: "border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50 dark:bg-fuchsia-950/40",
    badge:
      "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300",
    dot: "bg-fuchsia-500",
  },
  push: {
    card: "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40",
    badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  pull: {
    card: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40",
    badge:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  core: {
    card: "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40",
    badge:
      "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
  rest: {
    card: "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900",
    badge: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
    dot: "bg-zinc-300",
  },
};

/* 재사용 가능한 부위 블록 */

const REST: DayPlan = {
  focus: "휴식",
  tone: "rest",
  muscles: [],
  examples: [],
};

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
  focus: "밀기",
  tone: "push",
  muscles: ["가슴", "어깨", "삼두"],
  examples: ["벤치프레스", "오버헤드프레스", "딥스"],
};

const PULL: DayPlan = {
  focus: "당기기",
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

/**
 * 루틴 프리셋 — '주당 운동 일수' 기준으로 분류.
 * 1일·2일 루틴은 사용 빈도가 낮아 커스텀에서만 만들 수 있게 했다.
 */
export const SPLIT_PRESETS: SplitPreset[] = [
  {
    splits: 3,
    label: "3일 루틴",
    tagline: "주 3회 — 회복일이 충분한 입문/유지 루틴",
    variants: [
      {
        id: "cbl-3",
        name: "가슴 · 등 · 하체",
        description: "부위별 회복을 넉넉히 두는 클래식 3일 루틴",
        week: [CHEST, REST, BACK, REST, LEG, REST, REST],
      },
      {
        id: "fullbody-3",
        name: "전신 ×3",
        description: "하루에 전신을 모두 자극, 회복일을 충분히 확보",
        week: [FULLBODY, REST, FULLBODY, REST, FULLBODY, REST, REST],
      },
    ],
  },
  {
    splits: 4,
    label: "4일 루틴",
    tagline: "주 4회 — 부위 집중과 회복의 균형",
    variants: [
      {
        id: "upper-lower",
        name: "상체 · 하체",
        description: "가장 무난한 4일 루틴",
        week: [UPPER, LOWER, REST, UPPER, LOWER, REST, REST],
      },
      {
        id: "push-pull",
        name: "밀기 · 당기기",
        description: "미는 동작과 당기는 동작으로 구분",
        week: [PUSH, PULL, REST, PUSH, PULL, REST, REST],
      },
      {
        id: "cbsl-4",
        name: "가슴 · 등 · 어깨 · 하체",
        description: "부위별 집중도를 높이는 주 4회",
        week: [CHEST, BACK, SHOULDER, LEG, REST, REST, REST],
      },
      {
        id: "ct-bb-4",
        name: "가슴+삼두 · 등+이두 · 어깨 · 하체",
        description: "관절 움직임이 비슷한 부위를 묶은 4일 루틴",
        week: [CHEST_TRI, BACK_BI, SHOULDER, LEG, REST, REST, REST],
      },
    ],
  },
  {
    splits: 5,
    label: "5일 루틴",
    tagline: "주 5회 — 부위별로 하루씩 보디빌딩 스타일",
    variants: [
      {
        id: "bro-5",
        name: "가슴 · 등 · 어깨 · 팔 · 하체",
        description: "한 부위에 집중하는 브로 스플릿",
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
    label: "6일 루틴",
    tagline: "주 6회 — 거의 매일 운동하는 고볼륨",
    variants: [
      {
        id: "ppl-6",
        name: "Push · Pull · Legs ×2",
        description: "PPL을 주 2사이클, 7일차 휴식",
        week: [PUSH, PULL, LEG, PUSH, PULL, LEG, REST],
      },
      {
        id: "six-part",
        name: "가슴·등·어깨·팔·하체·코어",
        description: "부위를 잘게 쪼갠 6일 루틴",
        week: [CHEST, BACK, SHOULDER, ARM, LEG, CORE, REST],
      },
    ],
  },
  {
    splits: 7,
    label: "7일 루틴",
    tagline: "매일 운동 — 회복일 없이 부위 로테이션",
    variants: [
      {
        id: "ppl-arnold-7",
        name: "Push · Pull · Legs · 상체 · 하체 · 코어 · 유산소",
        description: "PPL 위주로 매일, 마지막 날 컨디셔닝 중심",
        week: [PUSH, PULL, LEG, UPPER, LOWER, CORE, FULLBODY],
      },
      {
        id: "seven-part",
        name: "가슴·등·어깨·팔·하체·코어·유산소",
        description: "부위별 1일 + 마지막 날 컨디셔닝",
        week: [CHEST, BACK, SHOULDER, ARM, LEG, CORE, FULLBODY],
      },
    ],
  },
];

export const DEFAULT_SPLITS = 3;
export const DEFAULT_VARIANT_ID = "cbl-3";

/** 과거 데이터 호환용 — 옛 splits 값(1,2)을 새 splits 로 매핑 */
const LEGACY_VARIANT_TO_SPLITS: Record<string, number> = {
  "fullbody-3": 3,
  "upper-lower": 4,
  "push-pull": 4,
  "cbl-3": 3,
  "ppl-6": 6,
  "ppl-x2": 6,
  "cbsl-4": 4,
  "ct-bb-4": 4,
  "bro-5": 5,
  "bro-5-alt": 5,
  "six-part": 6,
};

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
export const DAY_BLOCKS: Record<DayBlockId, { label: string; day: DayPlan }> = {
  rest: { label: "휴식", day: REST },
  fullbody: { label: "전신", day: FULLBODY },
  upper: { label: "상체", day: UPPER },
  lower: { label: "하체", day: LEG },
  chest: { label: "가슴", day: CHEST },
  back: { label: "등", day: BACK },
  shoulder: { label: "어깨", day: SHOULDER },
  arm: { label: "팔", day: ARM },
  push: { label: "밀기", day: PUSH },
  pull: { label: "당기기", day: PULL },
  core: { label: "코어 + 유산소", day: CORE },
};

export const DAY_BLOCK_IDS = Object.keys(DAY_BLOCKS) as DayBlockId[];

/**
 * 비어 있을 때 시작점이 되는 기본 커스텀 주간 (PPL + 휴식).
 * 각 요일은 블록 배열(1개 이상) — 멀티 부위 일자 지원.
 */
export const DEFAULT_CUSTOM_WEEK: DayBlockId[][] = [
  ["push"],
  ["pull"],
  ["lower"],
  ["rest"],
  ["push"],
  ["pull"],
  ["rest"],
];

export function isDayBlockId(value: unknown): value is DayBlockId {
  return typeof value === "string" && value in DAY_BLOCKS;
}

/**
 * 저장된 raw 를 신규 포맷`DayBlockId[][]` 로 정규화.
 * 기존 단일 부위 포맷`DayBlockId[]` 도 자동 래핑한다.
 * 길이가 7 이 아니거나 형식이 잘못됐으면 null.
 */
export function normalizeCustomWeek(raw: unknown): DayBlockId[][] | null {
  if (!Array.isArray(raw) || raw.length !== 7) return null;
  const out: DayBlockId[][] = [];
  for (const item of raw) {
    if (Array.isArray(item)) {
      // 신규 포맷: 배열 안 모두 유효한 블록 id
      const blocks = item.filter(isDayBlockId);
      if (blocks.length === 0) return null;
      out.push(blocks);
    } else if (isDayBlockId(item)) {
      // 구 포맷: 단일 문자열 → [그 블록]
      out.push([item]);
    } else {
      return null;
    }
  }
  return out;
}

/** 커스텀 주간이 신/구 포맷 중 하나로 유효한지 검증 */
export function isValidCustomWeek(week: unknown): week is DayBlockId[][] {
  return normalizeCustomWeek(week) !== null;
}

/**
 * 하루의 블록들을 하나의 DayPlan 으로 합친다.
 * - 전부 rest 이거나 비어있음 → rest 일
 * - 단일 부위 → 해당 블록의 DayPlan 그대로
 * - 멀티 부위 → focus 라벨"A + B", tone 은 첫 부위(색상용),
 * tones 는 모든 톤, muscles·examples 는 중복 제거 합집합
 */
export function composeDayPlan(blocks: DayBlockId[]): DayPlan {
  const nonRest = blocks.filter((b) => b !== "rest");
  if (nonRest.length === 0) return DAY_BLOCKS.rest.day;
  if (nonRest.length === 1) {
    const d = DAY_BLOCKS[nonRest[0]].day;
    return { ...d, tones: [d.tone] };
  }
  const days = nonRest.map((b) => DAY_BLOCKS[b].day);
  const tones = days.map((d) => d.tone);
  const focus = nonRest.map((b) => DAY_BLOCKS[b].label).join(" + ");
  const muscles = Array.from(new Set(days.flatMap((d) => d.muscles)));
  const examples = Array.from(new Set(days.flatMap((d) => d.examples))).slice(
    0,
    4,
  );
  return {
    focus,
    tone: tones[0],
    tones,
    muscles,
    examples,
  };
}

/** 블록 id 2차원 배열을 카탈로그 변형 형태로 복원 */
export function buildCustomVariant(week: DayBlockId[][]): RoutineVariant {
  const trainingDays = week.filter((blocks) =>
    blocks.some((b) => b !== "rest"),
  ).length;
  return {
    id: CUSTOM_VARIANT_ID,
    name: "커스텀 루틴",
    description: `직접 구성한 ${trainingDays}일 루틴`,
    week: week.map(composeDayPlan),
  };
}

const CUSTOM_PRESET_BASE = {
  splits: CUSTOM_SPLITS,
  label: "커스텀",
  tagline: "7일 주기를 직접 부위별로 채우는 나만의 루틴 (1일·2일 루틴도 여기서)",
};

/** variantId 로 어느 preset 에 속하는지 역추적. ppl-x2 같은 옛 id 도 매핑. */
function findPresetByVariantId(variantId: string): SplitPreset | null {
  for (const p of SPLIT_PRESETS) {
    if (p.variants.some((v) => v.id === variantId)) return p;
  }
  const legacySplits = LEGACY_VARIANT_TO_SPLITS[variantId];
  if (legacySplits !== undefined) {
    return SPLIT_PRESETS.find((p) => p.splits === legacySplits) ?? null;
  }
  return null;
}

export type ResolvedRoutine = {
  preset: SplitPreset;
  variant: RoutineVariant;
};

/**
 * splits + variantId 를 프리셋/변형으로 해석. 잘못된 값이면 기본값으로 대체.
 * variantId 가"custom" 이면 customWeek 로 합성 프리셋/변형을 만든다.
 */
export function resolveRoutine(
  splits: number,
  variantId: string,
  customWeek?: DayBlockId[][] | DayBlockId[] | null,
): ResolvedRoutine {
  if (variantId === CUSTOM_VARIANT_ID) {
    const normalized = normalizeCustomWeek(customWeek);
    if (normalized) {
      const variant = buildCustomVariant(normalized);
      return {
        preset: { ...CUSTOM_PRESET_BASE, variants: [variant] },
        variant,
      };
    }
  }

  // 1순위: variantId 로 정확히 매칭 — splits 값이 옛날 의미였어도 OK
  const byVariant = findPresetByVariantId(variantId);
  if (byVariant) {
    const variant = byVariant.variants.find((v) => v.id === variantId);
    if (variant) return { preset: byVariant, variant };
  }

  // 2순위: splits 매칭 → 첫 variant
  // 3순위: 기본값
  const preset =
    SPLIT_PRESETS.find((item) => item.splits === splits) ??
    SPLIT_PRESETS.find((item) => item.splits === DEFAULT_SPLITS)!;
  return { preset, variant: preset.variants[0] };
}

/**
 * 카탈로그에 존재하는 routine 인지 검증. variantId 기준 (splits 는 무시) —
 * 옛 splits 값(1,2) 으로 저장된 데이터도 호환.
 */
export function isValidRoutine(splits: number, variantId: string): boolean {
  void splits;
  return findPresetByVariantId(variantId) !== null;
}

/* ─── 기준일 기반 날짜 매핑 ──────────────────────────────────────────────────
 * 루틴은 요일 고정이 아니라 startDate(기준일)부터 7일 주기로 순환한다.
 *"오늘부터 다시 시작" = 기준일을 오늘로,"오늘 휴식 전환" = 기준일 +1일.
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

/** YYYY-MM-DD → { weekday:"월"~"일", label:"5/19"} */
export function ymdDisplay(ymd: string): { weekday: Weekday; label: string } {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const jsDay = dt.getUTCDay(); // 0=일
  const index = jsDay === 0 ? 6 : jsDay - 1; // 0=월
  return { weekday: WEEKDAYS[index], label: `${m}/${d}` };
}
