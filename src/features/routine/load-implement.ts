/**
 * 운동 도구 분석 — "이 운동은 무엇을 몇 개 들고 하나" 를 정하고, 그에 맞는 증량 단위를 준다.
 *
 * 같은 '덤벨' 이라도 덤벨 벤치프레스는 **두 개**(양손), 고블릿 스쿼트·원암 로우는 **한 개**다.
 * 앱은 무게를 **든 무게의 합**으로 기록하므로 증량 폭도 달라야 한다.
 *  - 덤벨 2개(양손) → 한 손 2kg 씩 = **4kg**
 *  - 덤벨 1개       → **2kg**
 *  - 바벨·스미스·랜드마인(봉 하나) → **5kg** (양쪽 2.5kg 원판)
 *  - 원판 하나 들고  → **5kg**
 *  - 머신·케이블(기구) → **5kg** (핀 한 칸)
 *  - 케틀벨 1개 4kg · 2개 8kg, 메디신볼 1kg, 슬레드 5kg
 *  - 맨몸·밴드·TRX 등 → 무게 없음(횟수·시간으로 올린다)
 *
 * `stepKg` 는 **한 번에 올리고 내리는 폭**, `gridKg` 는 **실제로 맞출 수 있는 가장 작은 눈금**이다.
 * 둘을 나눈 이유: 덤벨 10kg(한 손 5kg)을 기록한 사람에게 "4kg 격자가 아니니 12kg" 라고
 * 무게를 바꿔 버리면 안 된다. 지난 무게는 눈금(2kg)에만 맞추고, 거기서 단위(4kg)만큼 움직인다.
 *
 * **추천은 단위(step)로만** 한다. 대신 운동모드에서는 바벨·원판·기구를 `fineKg`(2.5kg)
 * 로 미세 조정할 수 있다 — 1.25kg 원판이나 보조추가 있는 헬스장에서 22.5kg 도 들 수 있게.
 *
 * 무게는 **든 무게의 합**이다 — 덤벨 2개면 양손 합계(`perHandKg` 로 한 손 무게를 보여 준다).
 *
 * 순수 모듈 — 1,237개 확장 카탈로그를 끌고 오지 않게 **운동 id 규칙**으로만 판단한다.
 */

import type { EquipmentId } from "@/features/routine/exercise-catalog-labels";

export type LoadImplement =
  /** 덤벨 두 개 — 양손에 하나씩. */
  | "dumbbell-pair"
  /** 덤벨 한 개 — 한 손, 또는 한 개를 양손으로. */
  | "dumbbell-single"
  /** 봉 하나에 원판(바벨·스미스·랜드마인). */
  | "barbell"
  /** 원판 하나를 들고. */
  | "plate"
  /** 핀 스택 기구(머신·케이블). */
  | "machine"
  | "kettlebell-single"
  | "kettlebell-pair"
  | "medicineball"
  | "sled"
  /** 무게로 올리지 않는 종목. */
  | "none"
  /** 기구를 모른다 — 원판 기준으로 안전하게. */
  | "unknown";

export type ImplementInfo = {
  implement: LoadImplement;
  /** 한 번에 올리고 내리는 폭(kg). 무게 종목이 아니면 null. */
  stepKg: number | null;
  /** 무게를 맞출 수 있는 가장 작은 눈금(kg). */
  gridKg: number | null;
  /** 화면용 이름("덤벨 2개(양손)"). */
  label: string;
  /** 왜 이 폭인지 한 마디("한 손 2kg씩"). 없으면 빈 문자열. */
  stepNote: string;
  /** 운동모드 미세 조정 폭(kg). 추천에는 안 쓴다. 없으면 null(미세 조정 버튼 없음). */
  fineKg: number | null;
  /** 양손에 하나씩 드는 도구인가 — 기록 무게는 양손 합계. */
  pair: boolean;
};

const INFO: Record<LoadImplement, Omit<ImplementInfo, "implement">> = {
  "dumbbell-pair": { stepKg: 4, gridKg: 2, label: "덤벨 2개(양손)", stepNote: "한 손 2kg씩", fineKg: null, pair: true },
  "dumbbell-single": { stepKg: 2, gridKg: 1, label: "덤벨 1개", stepNote: "", fineKg: null, pair: false },
  barbell: { stepKg: 5, gridKg: 2.5, label: "바벨", stepNote: "양쪽 2.5kg씩", fineKg: 2.5, pair: false },
  plate: { stepKg: 5, gridKg: 2.5, label: "원판 1장", stepNote: "", fineKg: 2.5, pair: false },
  machine: { stepKg: 5, gridKg: 2.5, label: "머신·케이블", stepNote: "핀 한 칸", fineKg: 2.5, pair: false },
  "kettlebell-single": { stepKg: 4, gridKg: 2, label: "케틀벨 1개", stepNote: "", fineKg: null, pair: false },
  "kettlebell-pair": { stepKg: 8, gridKg: 4, label: "케틀벨 2개(양손)", stepNote: "한 손 4kg씩", fineKg: null, pair: true },
  medicineball: { stepKg: 1, gridKg: 1, label: "메디신볼", stepNote: "", fineKg: null, pair: false },
  sled: { stepKg: 5, gridKg: 2.5, label: "슬레드", stepNote: "", fineKg: 2.5, pair: false },
  none: { stepKg: null, gridKg: null, label: "맨몸·무게 없음", stepNote: "", fineKg: null, pair: false },
  unknown: { stepKg: 2.5, gridKg: 2.5, label: "기구 미지정", stepNote: "", fineKg: null, pair: false },
};

/**
 * 덤벨을 **한 개만** 쓰는 종목.
 *
 * 이름에 규칙이 있는 것(single-arm·one-arm·goblet …)은 아래 패턴이 잡고, 여기엔 이름만으로는
 * 알 수 없는 것만 둔다. 카탈로그 운동법에 "덤벨 한 개" 라고 적힌 종목이 기준이다.
 * (기본 `barbell-row` 의 덤벨 변형은 "벤치에 한 손 지지" 원암 로우다.)
 */
const DUMBBELL_SINGLE_IDS: ReadonlySet<string> = new Set([
  "barbell-row",
  "concentration-curl",
  "triceps-kickback",
  "overhead-triceps-extension",
  "dumbbell-overhead-extension",
  "russian-twist",
  "sumo-squat",
  "dumbbell-sumo-deadlift",
  "dumbbell-swing",
  "dumbbell-snatch",
  "dumbbell-windmill",
  "dumbbell-turkish-get-up",
  "dumbbell-side-bend",
  "dumbbell-hip-thrust",
  "dumbbell-glute-bridge",
  "dumbbell-pull-through",
  "weighted-dead-bug",
  "single-leg-calf-raise",
  "dumbbell-external-rotation",
  "dumbbell-internal-rotation",
  "side-lying-external-rotation",
]);

/** 이름에 이게 들어가면 덤벨 한 개. */
const DUMBBELL_SINGLE_PATTERN =
  /(^|-)(single-arm|one-arm|goblet|pullover|suitcase|concentration|kickback)(-|$)/;

/** 케틀벨 두 개를 쓰는 종목(나머지는 한 개). */
const KETTLEBELL_PAIR_PATTERN = /(^|-)(double|renegade|seesaw)(-|$)/;

/** 기구를 모를 때 운동 id 로 짐작한다 — 이름에 기구가 박힌 확실한 경우만. */
function equipmentFromId(exerciseId: string): EquipmentId | null {
  if (/(^|-)dumbbell(-|$)/.test(exerciseId)) return "dumbbell";
  if (/(^|-)kettlebell(-|$)/.test(exerciseId)) return "kettlebell";
  if (/(^|-)(barbell|smith|ez-bar)(-|$)/.test(exerciseId)) return "barbell";
  if (/(^|-)landmine(-|$)/.test(exerciseId)) return "landmine";
  if (/(^|-)(cable|machine)(-|$)/.test(exerciseId)) return "machine";
  if (/^plate-/.test(exerciseId)) return "plate";
  return null;
}

/** 덤벨 종목이 한 개짜리인지. */
export function isSingleDumbbellExercise(exerciseId: string): boolean {
  return DUMBBELL_SINGLE_IDS.has(exerciseId) || DUMBBELL_SINGLE_PATTERN.test(exerciseId);
}

/**
 * 이 운동을 이 기구로 할 때 무엇을 드는지.
 *
 * @param bodyweight 맨몸 종목인가(`loadClassOf === "bodyweight"`). 기구를 따로 골랐으면
 *                   (예: 풀업에 원판을 달면) 그 기구가 이긴다.
 */
export function loadImplementOf(
  exerciseId: string,
  equipment?: EquipmentId | string | null,
  bodyweight = false,
): LoadImplement {
  const eq = equipment || equipmentFromId(exerciseId);
  switch (eq) {
    case "dumbbell":
      return isSingleDumbbellExercise(exerciseId) ? "dumbbell-single" : "dumbbell-pair";
    case "barbell":
    case "smith":
    case "landmine":
      return "barbell";
    case "plate":
      return "plate";
    case "machine":
    case "cable":
      return "machine";
    case "kettlebell":
      return KETTLEBELL_PAIR_PATTERN.test(exerciseId) ? "kettlebell-pair" : "kettlebell-single";
    case "medicineball":
      return "medicineball";
    case "sled":
      return "sled";
    case "bodyweight":
    case "band":
    case "trx":
    case "bosu":
    case "ball":
    case "battlerope":
      return "none";
    default:
      return bodyweight ? "none" : "unknown";
  }
}

/** 도구 → 증량 폭·눈금·이름. */
export function implementInfo(implement: LoadImplement): ImplementInfo {
  return { implement, ...INFO[implement] };
}

/**
 * 한 손 무게 — 양손에 하나씩 드는 도구(덤벨·케틀벨 2개)만. 기록은 양손 합계라
 * 랙 앞에서 "몇 kg 덤벨을 집어야 하나" 를 암산하지 않게 반으로 나눠 보여 준다.
 */
export function perHandKg(totalKg: number | null, implement: LoadImplement): number | null {
  if (totalKg === null || totalKg <= 0 || !INFO[implement].pair) return null;
  return Math.round((totalKg / 2) * 100) / 100;
}
