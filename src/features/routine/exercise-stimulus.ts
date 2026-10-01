/**
 * 운동별 세부 근육 자극 점수(0~100) — 맞춤 운동 1단계(2026-10-01,
 * `docs/sub-muscle-score-lite-plan-2026-10-01.html`).
 *
 * "이 운동 한 세트가 그 세부 근육을 얼마나 자극하나". 주동근 하나는 100, 보조근은 그 아래.
 * 벤치프레스는 가슴 중부 100인데 삼두 외측두 45·전면 어깨 55처럼 **보조근까지** 적는다 —
 * 예전 매핑(`sub-muscles.ts`)은 순서만 있고 보조근이 빠져, 벤치만 한 사람도 "삼두 안 함"이었다.
 *
 * 🔴 숫자는 **초안**이다(근전도 연구의 일반적 경향 + 트레이너 상식). 트레이너 검수를 받아 이 표만
 *    고치면 추천 전체가 따라온다. 손으로 적은 건 실제 기록 상위 운동(기록의 95% 이상)이고,
 *    나머지는 `stimulusFor` 가 기존 매핑 + 보조근 규칙으로 채운다.
 *
 * 순수 모듈(카탈로그를 import 하지 않는다 — 폴백에 필요한 기존 가중치는 호출자가 넘긴다).
 */

export type Stimulus = Readonly<Record<string, number>>;

/* 자주 쓰는 보조근 묶음 — 같은 성격의 운동이 같은 숫자를 쓰게. */
const PRESS_TRI = { "arm-triceps-lateral": 45, "arm-triceps-medial": 40, "arm-triceps-long": 25 };
const PULL_BI = { "arm-biceps-long": 40, "arm-biceps-short": 35, "arm-forearm": 25 };

export const EXERCISE_STIMULUS: Record<string, Stimulus> = {
  /* ── 가슴 ── */
  "bench-press": { "chest-mid": 100, "chest-lower": 70, "chest-upper": 45, "chest-inner": 40, "shoulder-front": 55, ...PRESS_TRI },
  "dumbbell-bench-press": { "chest-mid": 100, "chest-lower": 65, "chest-upper": 45, "chest-inner": 50, "shoulder-front": 55, "arm-triceps-lateral": 35, "arm-triceps-medial": 30, "arm-triceps-long": 15 },
  "machine-chest-press": { "chest-mid": 100, "chest-lower": 60, "chest-upper": 40, "chest-inner": 40, "shoulder-front": 45, "arm-triceps-lateral": 40, "arm-triceps-medial": 35, "arm-triceps-long": 20 },
  "incline-press": { "chest-upper": 100, "chest-mid": 60, "chest-lower": 20, "chest-inner": 30, "shoulder-front": 70, "arm-triceps-lateral": 40, "arm-triceps-medial": 35, "arm-triceps-long": 20 },
  "incline-dumbbell-bench-press": { "chest-upper": 100, "chest-mid": 55, "chest-lower": 15, "chest-inner": 40, "shoulder-front": 65, "arm-triceps-lateral": 30, "arm-triceps-medial": 30, "arm-triceps-long": 15 },
  "decline-press": { "chest-lower": 100, "chest-mid": 70, "chest-upper": 15, "chest-inner": 30, "shoulder-front": 30, "arm-triceps-lateral": 45, "arm-triceps-medial": 40, "arm-triceps-long": 25 },
  dips: { "chest-lower": 100, "chest-mid": 60, "chest-inner": 30, "shoulder-front": 50, "arm-triceps-medial": 70, "arm-triceps-lateral": 65, "arm-triceps-long": 40 },
  "push-up": { "chest-mid": 100, "chest-lower": 60, "chest-upper": 40, "chest-inner": 35, "shoulder-front": 50, "arm-triceps-lateral": 40, "arm-triceps-medial": 40, "arm-triceps-long": 20, "core-upper-abs": 25 },
  "close-grip-bench-press": { "arm-triceps-lateral": 100, "arm-triceps-medial": 90, "arm-triceps-long": 55, "chest-inner": 60, "chest-mid": 55, "shoulder-front": 45 },
  "chest-fly": { "chest-inner": 100, "chest-mid": 85, "chest-upper": 40, "chest-lower": 40, "shoulder-front": 35 },
  "pec-deck": { "chest-inner": 100, "chest-mid": 85, "chest-upper": 35, "chest-lower": 40, "shoulder-front": 25 },
  "cable-crossover": { "chest-inner": 100, "chest-lower": 80, "chest-mid": 60, "shoulder-front": 25 },
  "dumbbell-pullover": { "chest-lower": 80, "back-lats": 100, "arm-triceps-long": 40, "chest-mid": 40 },

  /* ── 등 ── */
  "lat-pulldown": { "back-lats": 100, "back-rhomboids": 50, "back-traps": 25, "shoulder-rear": 35, ...PULL_BI },
  "pull-up": { "back-lats": 100, "back-rhomboids": 50, "back-traps": 30, "shoulder-rear": 30, "arm-biceps-long": 50, "arm-biceps-short": 45, "arm-forearm": 40, "core-lower-abs": 20 },
  "chin-up": { "back-lats": 100, "back-rhomboids": 45, "arm-biceps-short": 70, "arm-biceps-long": 60, "arm-forearm": 35, "shoulder-rear": 25 },
  "assisted-pull-up": { "back-lats": 100, "back-rhomboids": 45, "shoulder-rear": 30, ...PULL_BI },
  "straight-arm-pulldown": { "back-lats": 100, "arm-triceps-long": 35, "shoulder-rear": 20, "core-upper-abs": 20 },
  "seated-cable-row": { "back-rhomboids": 100, "back-lats": 85, "back-traps": 50, "shoulder-rear": 50, ...PULL_BI },
  "low-row-machine": { "back-lats": 100, "back-rhomboids": 85, "back-traps": 40, "shoulder-rear": 40, ...PULL_BI },
  "t-bar-row": { "back-lats": 100, "back-rhomboids": 90, "back-traps": 55, "back-erector": 45, "shoulder-rear": 45, ...PULL_BI },
  "barbell-row": { "back-lats": 100, "back-rhomboids": 90, "back-traps": 55, "back-erector": 55, "shoulder-rear": 45, ...PULL_BI },
  "one-arm-dumbbell-row": { "back-lats": 100, "back-rhomboids": 70, "back-traps": 35, "shoulder-rear": 40, ...PULL_BI },
  deadlift: { "back-erector": 100, "lower-glutes": 85, "lower-hamstrings": 75, "back-lats": 50, "back-traps": 60, "lower-quads": 45, "arm-forearm": 55, "core-upper-abs": 25 },
  shrug: { "back-traps": 100, "arm-forearm": 40 },
  hyperextension: { "back-erector": 100, "lower-glutes": 60, "lower-hamstrings": 50 },

  /* ── 어깨 ── */
  ohp: { "shoulder-front": 100, "shoulder-side": 55, "chest-upper": 25, "back-traps": 30, "arm-triceps-lateral": 45, "arm-triceps-medial": 40, "arm-triceps-long": 30, "core-upper-abs": 20 },
  "machine-shoulder-press": { "shoulder-front": 100, "shoulder-side": 55, "chest-upper": 20, "arm-triceps-lateral": 40, "arm-triceps-medial": 35, "arm-triceps-long": 25 },
  "smith-machine-shoulder-press": { "shoulder-front": 100, "shoulder-side": 55, "chest-upper": 25, "arm-triceps-lateral": 45, "arm-triceps-medial": 40, "arm-triceps-long": 25 },
  "dumbbell-shoulder-press": { "shoulder-front": 100, "shoulder-side": 60, "chest-upper": 20, "arm-triceps-lateral": 40, "arm-triceps-medial": 35, "arm-triceps-long": 25 },
  "arnold-press": { "shoulder-front": 100, "shoulder-side": 70, "chest-upper": 20, "arm-triceps-lateral": 35, "arm-triceps-medial": 30, "arm-triceps-long": 20 },
  "lateral-raise": { "shoulder-side": 100, "shoulder-front": 30, "back-traps": 30, "shoulder-rear": 15 },
  "cable-lateral-raise": { "shoulder-side": 100, "shoulder-front": 25, "back-traps": 25, "shoulder-rear": 15 },
  "upright-row": { "shoulder-side": 100, "back-traps": 80, "shoulder-front": 50, "arm-biceps-long": 25 },
  "front-raise": { "shoulder-front": 100, "shoulder-side": 30, "chest-upper": 30 },
  "rear-delt-fly": { "shoulder-rear": 100, "back-rhomboids": 55, "back-traps": 40, "shoulder-side": 25 },
  "machine-rear-delt-fly": { "shoulder-rear": 100, "back-rhomboids": 55, "back-traps": 35, "shoulder-side": 20 },
  "single-arm-cable-rear-delt-fly": { "shoulder-rear": 100, "back-rhomboids": 45, "back-traps": 30, "shoulder-side": 25 },
  "reverse-pec-deck": { "shoulder-rear": 100, "back-rhomboids": 60, "back-traps": 40 },
  "face-pull": { "shoulder-rear": 100, "back-rhomboids": 60, "back-traps": 60, "shoulder-side": 25, "arm-biceps-long": 20 },

  /* ── 이두·전완 ── */
  "biceps-curl": { "arm-biceps-short": 100, "arm-biceps-long": 90, "arm-forearm": 35 },
  "ez-bar-curl": { "arm-biceps-short": 100, "arm-biceps-long": 85, "arm-forearm": 40 },
  "standing-cable-curl": { "arm-biceps-short": 100, "arm-biceps-long": 90, "arm-forearm": 30 },
  "cable-curl": { "arm-biceps-short": 100, "arm-biceps-long": 90, "arm-forearm": 30 },
  "incline-curl": { "arm-biceps-long": 100, "arm-biceps-short": 60, "arm-forearm": 25 },
  "preacher-curl": { "arm-biceps-short": 100, "arm-biceps-long": 55, "arm-forearm": 30 },
  "concentration-curl": { "arm-biceps-short": 100, "arm-biceps-long": 60, "arm-forearm": 25 },
  "hammer-curl": { "arm-forearm": 100, "arm-biceps-long": 75, "arm-biceps-short": 45 },

  /* ── 삼두 ── */
  "skull-crusher": { "arm-triceps-long": 100, "arm-triceps-lateral": 70, "arm-triceps-medial": 70 },
  "overhead-triceps-extension": { "arm-triceps-long": 100, "arm-triceps-medial": 60, "arm-triceps-lateral": 50 },
  "triceps-pushdown": { "arm-triceps-lateral": 100, "arm-triceps-medial": 85, "arm-triceps-long": 45 },
  "triceps-pushdown-2": { "arm-triceps-lateral": 100, "arm-triceps-medial": 85, "arm-triceps-long": 45 },
  "triceps-kickback": { "arm-triceps-lateral": 100, "arm-triceps-long": 60, "arm-triceps-medial": 55 },
  "diamond-pushup": { "arm-triceps-medial": 100, "arm-triceps-lateral": 90, "arm-triceps-long": 50, "chest-inner": 55, "chest-mid": 45, "shoulder-front": 35 },

  /* ── 하체 ── */
  squat: { "lower-quads": 100, "lower-glutes": 75, "lower-adductors": 55, "lower-hamstrings": 30, "back-erector": 45, "core-upper-abs": 20 },
  "front-squat": { "lower-quads": 100, "lower-glutes": 60, "lower-adductors": 45, "back-erector": 40, "core-upper-abs": 30 },
  "goblet-squat": { "lower-quads": 100, "lower-glutes": 70, "lower-adductors": 50, "core-upper-abs": 25 },
  "hack-squat": { "lower-quads": 100, "lower-glutes": 55, "lower-adductors": 40 },
  "leg-press": { "lower-quads": 100, "lower-glutes": 65, "lower-adductors": 45, "lower-hamstrings": 20 },
  "leg-extension": { "lower-quads": 100 },
  lunge: { "lower-quads": 100, "lower-glutes": 85, "lower-adductors": 45, "lower-hamstrings": 30 },
  "walking-lunge": { "lower-quads": 100, "lower-glutes": 90, "lower-adductors": 45, "lower-hamstrings": 30 },
  "bulgarian-split-squat": { "lower-quads": 100, "lower-glutes": 90, "lower-adductors": 45, "lower-hamstrings": 30 },
  "step-up": { "lower-quads": 100, "lower-glutes": 85, "lower-hamstrings": 25 },
  rdl: { "lower-hamstrings": 100, "lower-glutes": 85, "back-erector": 55, "lower-adductors": 30, "arm-forearm": 30 },
  "sumo-deadlift": { "lower-glutes": 100, "lower-adductors": 85, "lower-quads": 65, "lower-hamstrings": 60, "back-erector": 70, "back-traps": 45, "arm-forearm": 45 },
  "leg-curl": { "lower-hamstrings": 100, "lower-calves": 20 },
  "seated-leg-curl": { "lower-hamstrings": 100, "lower-calves": 15 },
  "single-leg-curl": { "lower-hamstrings": 100, "lower-calves": 20 },
  "hip-thrust": { "lower-glutes": 100, "lower-hamstrings": 45, "lower-quads": 30, "lower-adductors": 25 },
  "hip-abduction": { "lower-glutes": 100 },
  "hip-adduction": { "lower-adductors": 100 },
  "standing-calf-raise": { "lower-calves": 100 },
  "seated-calf-raise": { "lower-calves": 100 },

  /* ── 코어 ── */
  plank: { "core-upper-abs": 100, "core-lower-abs": 90, "core-obliques": 55, "shoulder-front": 20 },
  crunch: { "core-upper-abs": 100, "core-obliques": 35, "core-lower-abs": 30 },
  "cable-crunch": { "core-upper-abs": 100, "core-lower-abs": 40, "core-obliques": 35 },
  "hanging-leg-raise": { "core-lower-abs": 100, "core-upper-abs": 55, "core-obliques": 45, "arm-forearm": 40 },
  "toes-to-bar": { "core-lower-abs": 100, "core-upper-abs": 60, "core-obliques": 45, "back-lats": 30, "arm-forearm": 45 },
  "mountain-climber": { "core-lower-abs": 100, "core-upper-abs": 55, "core-obliques": 45, "shoulder-front": 30 },
  "russian-twist": { "core-obliques": 100, "core-upper-abs": 45 },
};

/** 같은 운동의 변형 id(카탈로그 확장분 `-2` 등) → 손 점수가 있는 기본 운동. */
const ALIASES: Record<string, string> = {
  "hammer-curl-2": "hammer-curl",
  "close-grip-bench-press-2": "close-grip-bench-press",
  "assisted-pull-up-2": "assisted-pull-up",
  "rope-triceps-pushdown": "triceps-pushdown",
  "cable-overhead-triceps-extension": "overhead-triceps-extension",
  "dumbbell-biceps-curl": "biceps-curl",
  "barbell-curl": "biceps-curl",
  "machine-row": "low-row-machine",
  "matrix-seated-row": "seated-cable-row",
  "cable-rear-delt-fly-2": "single-arm-cable-rear-delt-fly",
  "cable-rear-delt-fly": "single-arm-cable-rear-delt-fly",
  "machine-decline-chest-press": "decline-press",
  "hammer-strength-decline-press": "decline-press",
  "close-grip-push-up": "diamond-pushup",
  "smith-squat": "squat",
  "box-squat": "squat",
  "belt-squat": "squat",
  "stiff-leg-deadlift": "rdl",
};

/** 손으로 적었나(별칭 포함). 화면의 "검수된 점수" 표시·커버리지 테스트용. */
export function hasCuratedStimulus(exerciseId: string): boolean {
  return Boolean(EXERCISE_STIMULUS[exerciseId] ?? EXERCISE_STIMULUS[ALIASES[exerciseId] ?? ""]);
}

/**
 * 손 점수가 없는 운동에 붙이는 보조근 규칙. 주동근(점수 100)이 무엇이냐로 고른다 —
 * 같은 성격(가슴 프레스·당기기·스쿼트·힌지)이면 같은 보조근을 쓴다.
 */
function synergistsFor(primary: string, has: (id: string) => boolean): Record<string, number> {
  const out: Record<string, number> = {};
  const add = (id: string, v: number) => {
    out[id] = Math.max(out[id] ?? 0, v);
  };
  if (primary.startsWith("chest-") && primary !== "chest-inner") {
    add("shoulder-front", 50);
    add("arm-triceps-lateral", 40);
    add("arm-triceps-medial", 35);
    add("arm-triceps-long", 20);
  }
  if (primary === "shoulder-front") {
    add("shoulder-side", 50);
    add("arm-triceps-lateral", 40);
    add("arm-triceps-medial", 35);
    add("arm-triceps-long", 25);
  }
  if (primary === "back-lats" || primary === "back-rhomboids") {
    add("arm-biceps-long", 35);
    add("arm-biceps-short", 35);
    add("arm-forearm", 25);
    add("shoulder-rear", 30);
  }
  if (primary === "lower-quads") {
    add("lower-glutes", has("lower-glutes") ? 70 : 60);
    add("lower-adductors", 35);
  }
  if (primary === "lower-hamstrings") {
    add("lower-glutes", 70);
    add("back-erector", 40);
  }
  return out;
}

/**
 * 운동 → 세부 근육 점수. 손 점수(별칭 포함)가 있으면 그것, 없으면 기존 매핑의 기여도
 * (`weights`: 1 / 0.5 / 0.35…)를 ×100 하고 보조근 규칙을 더한다. 매핑도 없으면 빈 표.
 */
export function stimulusFor(
  exerciseId: string,
  weights: readonly { id: string; weight: number }[] = [],
): Stimulus {
  const curated = EXERCISE_STIMULUS[exerciseId] ?? EXERCISE_STIMULUS[ALIASES[exerciseId] ?? ""];
  if (curated) return curated;
  if (weights.length === 0) return {};
  const out: Record<string, number> = {};
  for (const w of weights) out[w.id] = Math.max(out[w.id] ?? 0, Math.round(w.weight * 100));
  const primary = weights[0].id;
  for (const [id, v] of Object.entries(synergistsFor(primary, (x) => x in out))) {
    if (!(id in out)) out[id] = v;
  }
  return out;
}
