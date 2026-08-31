/**
 * 운동 카탈로그의 **라벨·타입만** 담은 얇은 계층 — 클라이언트 번들 다이어트용.
 *
 * `exercise-catalog.ts` 는 1,237개 확장 카탈로그를 함께 물고 있어, 기구 라벨 하나
 * 쓰자고 import 하면 **315 KiB 청크가 통째로 화면에 실렸다**(운동 종목 리스트·운동
 * 상세가 그랬다). 데이터가 필요 없는 컴포넌트는 이 모듈만 import 한다.
 *
 * 여기엔 **표시용 상수와 타입만** 둔다. 운동 데이터(EXERCISES / 확장 카탈로그)나
 * 그걸 뒤지는 함수는 절대 넣지 않는다 — 넣는 순간 다이어트가 원복된다.
 * `exercise-catalog.ts` 가 이 모듈을 그대로 재수출하므로 기존 import 는 안 바뀐다.
 */

export type EquipmentId =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "smith"
  | "kettlebell"
  | "band"
  | "trx"
  | "medicineball"
  | "landmine"
  | "sled"
  | "battlerope"
  | "bosu"
  | "ball"
  | "plate"
  | "other";

export const EQUIPMENT_LABELS: Record<EquipmentId, string> = {
  barbell: "바벨",
  dumbbell: "덤벨",
  machine: "머신",
  cable: "케이블",
  bodyweight: "맨몸",
  smith: "스미스",
  kettlebell: "케틀벨",
  band: "밴드",
  trx: "TRX",
  medicineball: "메디신볼",
  landmine: "랜드마인",
  sled: "슬레드",
  battlerope: "배틀로프",
  bosu: "보수",
  ball: "짐볼",
  plate: "원판",
  other: "기타",
};

export type EquipmentVariant = {
  equipment: EquipmentId;
  /**
   * 기구별 운동법 단계.
   *
   * ⚠ 기본 카탈로그(`exercise-catalog.ts` 의 `EXERCISES`)에만 들어 있다. 확장 카탈로그
   * (`exercise-catalog-extra.ts`, 1,237개)는 **단계 텍스트가 빠져 있다** — 그게
   * 클라이언트 번들에 350KiB 를 얹던 주범이라 서버 전용 모듈
   * (`exercise-catalog-extra-methods.ts`)로 뺐다.
   * 그래서 단계를 읽을 땐 이 필드가 아니라 `exercise-methods.ts` 의
   * `methodSteps(운동id, 기구)` 를 쓴다(둘을 합쳐서 돌려준다).
   */
  method?: string[];
};

export type CatalogExercise = {
  id: string;
  name: string;
  /** 자극 부위 요약 */
  target: string;
  /** 선택 가능한 기구 (첫 항목이 기본 선택) */
  equipments: EquipmentVariant[];
};

/**
 * 운동 종목 리스트(/exercises) 그룹용 1차 부위.
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

/** 부위별 배지 색상 (라이트/다크). 운동이 어느 부위인지 한눈에 구분. */
export const BODY_PART_TONE: Record<BodyPart, string> = {
  chest: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  back: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  shoulder: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  arm: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  lower: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
  core: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
};

export const BODY_PART_ORDER: BodyPart[] = [
  "chest",
  "back",
  "shoulder",
  "arm",
  "lower",
  "core",
];

/** 여러 부위를 함께 쓰는 운동(전신)의 배지 색. */
export const FULLBODY_TONE =
  "bg-zinc-200 text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200";

/** 문자열이 기구 id 인지 — DB/URL 에서 들어온 값 검증용. */
export function isEquipmentId(value: unknown): value is EquipmentId {
  return typeof value === "string" && value in EQUIPMENT_LABELS;
}
