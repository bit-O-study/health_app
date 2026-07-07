/**
 * 다짐 미션 — 순수 로직(미션 카탈로그·설문→미션 생성·하루 달성 판정·캘린더 마커).
 * 서버/DB 의존 없음(테스트 가능). 달성은 앱에 쌓이는 기록(운동·식단)에서 자동 판정한다.
 */

/** 하루치 기록 요약 — 미션 자동 판정의 입력. data-access 가 날짜별로 채운다. */
export type DayStats = {
  workedOut: boolean; // 그날 운동(근력/유산소) 완료가 하나라도 있나
  workoutCount: number; // 완료한 운동 개수
  burnKcal: number; // 소비 칼로리(근력+유산소)
  cardioMin: number; // 유산소 총 분
  loggedDiet: boolean; // 식단 기록 존재
  mealCount: number; // 기록한 끼니 수(아침/점심/저녁/간식 중 몇 종류)
  intakeKcal: number; // 섭취 총 kcal
  proteinG: number; // 섭취 단백질 g
};

export const EMPTY_DAY: DayStats = {
  workedOut: false,
  workoutCount: 0,
  burnKcal: 0,
  cardioMin: 0,
  loggedDiet: false,
  mealCount: 0,
  intakeKcal: 0,
  proteinG: 0,
};

export type MissionType =
  | "workout_today"
  | "workout_count"
  | "burn_kcal"
  | "cardio_min"
  | "meal_log"
  | "meal_count"
  | "intake_max"
  | "protein_min"
  | "strength_today"
  | "no_late_snack";

/** 미션 정의(카탈로그). check(day, target) → 그날 달성 여부. */
export type MissionDef = {
  type: MissionType;
  /** {n} 자리에 target 을 넣어 라벨 완성. */
  label: (target: number) => string;
  kind: "workout" | "diet";
  /** 목표 수치가 필요한가(false 면 존재 자체가 미션). */
  needsTarget: boolean;
  defaultTarget: number;
  unit: string;
  /** 목표 방향 — atmost 는 이하가 달성. */
  dir: "atleast" | "atmost";
  check: (day: DayStats, target: number) => boolean;
};

export const MISSION_CATALOG: Record<MissionType, MissionDef> = {
  workout_today: {
    type: "workout_today",
    label: () => "오늘 운동하기",
    kind: "workout",
    needsTarget: false,
    defaultTarget: 0,
    unit: "",
    dir: "atleast",
    check: (d) => d.workedOut,
  },
  strength_today: {
    type: "strength_today",
    label: () => "근력 운동하기",
    kind: "workout",
    needsTarget: false,
    defaultTarget: 0,
    unit: "",
    dir: "atleast",
    check: (d) => d.workoutCount > 0,
  },
  workout_count: {
    type: "workout_count",
    label: (n) => `운동 ${n}개 이상 완료`,
    kind: "workout",
    needsTarget: true,
    defaultTarget: 3,
    unit: "개",
    dir: "atleast",
    check: (d, t) => d.workoutCount >= t,
  },
  burn_kcal: {
    type: "burn_kcal",
    label: (n) => `${n}kcal 소비하기`,
    kind: "workout",
    needsTarget: true,
    defaultTarget: 300,
    unit: "kcal",
    dir: "atleast",
    check: (d, t) => d.burnKcal >= t,
  },
  cardio_min: {
    type: "cardio_min",
    label: (n) => `유산소 ${n}분 하기`,
    kind: "workout",
    needsTarget: true,
    defaultTarget: 20,
    unit: "분",
    dir: "atleast",
    check: (d, t) => d.cardioMin >= t,
  },
  meal_log: {
    type: "meal_log",
    label: () => "식단 기록하기",
    kind: "diet",
    needsTarget: false,
    defaultTarget: 0,
    unit: "",
    dir: "atleast",
    check: (d) => d.loggedDiet,
  },
  meal_count: {
    type: "meal_count",
    label: (n) => `${n}끼 기록하기`,
    kind: "diet",
    needsTarget: true,
    defaultTarget: 3,
    unit: "끼",
    dir: "atleast",
    check: (d, t) => d.mealCount >= t,
  },
  intake_max: {
    type: "intake_max",
    label: (n) => `${n}kcal 이하로 먹기`,
    kind: "diet",
    needsTarget: true,
    defaultTarget: 2000,
    unit: "kcal",
    dir: "atmost",
    // 기록이 있어야 판정(기록 없으면 미달성).
    check: (d, t) => d.loggedDiet && d.intakeKcal <= t,
  },
  protein_min: {
    type: "protein_min",
    label: (n) => `단백질 ${n}g 먹기`,
    kind: "diet",
    needsTarget: true,
    defaultTarget: 100,
    unit: "g",
    dir: "atleast",
    check: (d, t) => d.proteinG >= t,
  },
  no_late_snack: {
    type: "no_late_snack",
    label: (n) => `하루 ${n}kcal 이하 유지(과식 X)`,
    kind: "diet",
    needsTarget: true,
    defaultTarget: 2200,
    unit: "kcal",
    dir: "atmost",
    check: (d, t) => d.loggedDiet && d.intakeKcal <= t,
  },
};

export const MISSION_TYPES = Object.keys(MISSION_CATALOG) as MissionType[];

/** 다짐에 저장되는 미션 스펙(설문 결과). */
export type MissionSpec = { type: MissionType; target: number };

export function missionLabel(spec: MissionSpec): string {
  return MISSION_CATALOG[spec.type].label(spec.target);
}

/** 유효한 미션 스펙만 정규화(알 수 없는 타입/음수 목표 제거). */
export function sanitizeMissions(raw: unknown): MissionSpec[] {
  if (!Array.isArray(raw)) return [];
  const out: MissionSpec[] = [];
  const seen = new Set<MissionType>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const type = (r as { type?: unknown }).type;
    if (typeof type !== "string" || !(type in MISSION_CATALOG)) continue;
    const mt = type as MissionType;
    if (seen.has(mt)) continue;
    const def = MISSION_CATALOG[mt];
    const t = Number((r as { target?: unknown }).target);
    const target = def.needsTarget
      ? Number.isFinite(t) && t > 0
        ? Math.round(t)
        : def.defaultTarget
      : 0;
    seen.add(mt);
    out.push({ type: mt, target });
  }
  return out;
}

/** 하루 달성 판정 — done/total/pct. 미션 없으면 pct 0. */
export function achievementForDay(
  missions: MissionSpec[],
  day: DayStats,
): { done: number; total: number; pct: number } {
  const total = missions.length;
  if (total === 0) return { done: 0, total: 0, pct: 0 };
  let done = 0;
  for (const m of missions) {
    if (MISSION_CATALOG[m.type].check(day, m.target)) done += 1;
  }
  return { done, total, pct: Math.round((done / total) * 100) };
}

export type MarkerLevel = "circle" | "triangle" | "cross";

/** 달성률 → 캘린더 마커. 70%+ ○, 40%+ △, 그 미만 ✗. 미션 없으면 null. */
export function markerForPct(pct: number, hasMissions: boolean): MarkerLevel | null {
  if (!hasMissions) return null;
  if (pct >= 70) return "circle";
  if (pct >= 40) return "triangle";
  return "cross";
}

export const MARKER_SYMBOL: Record<MarkerLevel, string> = {
  circle: "○",
  triangle: "△",
  cross: "✕",
};

/* ── 설문 → 미션 ─────────────────────────────────────────────────────────── */

export type SurveyGoal = "lose" | "gain" | "maintain" | "stamina";

/** 설문 답변 — 각 항목을 켜면(enabled) 해당 미션이 생성된다. */
export type SurveyAnswers = {
  goal: SurveyGoal;
  workoutDaily: boolean; // 매일 운동
  strengthDaily: boolean; // 근력 운동
  cardioMin: number; // 유산소 목표 분(0=끄기)
  burnKcal: number; // 소비 kcal 목표(0=끄기)
  logMeals: boolean; // 식단 기록
  mealCount: number; // 끼니 수(0=끄기)
  intakeMax: number; // 섭취 상한 kcal(0=끄기)
  proteinMin: number; // 단백질 목표 g(0=끄기)
};

export const DEFAULT_SURVEY: SurveyAnswers = {
  goal: "lose",
  workoutDaily: true,
  strengthDaily: false,
  cardioMin: 0,
  burnKcal: 300,
  logMeals: true,
  mealCount: 3,
  intakeMax: 0,
  proteinMin: 0,
};

/** 목표별 추천 프리셋(설문 초기값). */
export const GOAL_PRESETS: Record<SurveyGoal, Partial<SurveyAnswers>> = {
  lose: { burnKcal: 400, cardioMin: 30, logMeals: true, mealCount: 3, intakeMax: 1800, proteinMin: 90 },
  gain: { strengthDaily: true, burnKcal: 0, logMeals: true, mealCount: 4, intakeMax: 0, proteinMin: 130 },
  maintain: { workoutDaily: true, burnKcal: 250, logMeals: true, mealCount: 3, intakeMax: 2200, proteinMin: 80 },
  stamina: { workoutDaily: true, cardioMin: 40, burnKcal: 350, logMeals: false, mealCount: 0, proteinMin: 0 },
};

/** 설문 답변 → 미션 목록. 켜진 항목만 생성. */
export function buildMissionsFromSurvey(a: SurveyAnswers): MissionSpec[] {
  const out: MissionSpec[] = [];
  if (a.workoutDaily) out.push({ type: "workout_today", target: 0 });
  if (a.strengthDaily) out.push({ type: "strength_today", target: 0 });
  if (a.cardioMin > 0) out.push({ type: "cardio_min", target: Math.round(a.cardioMin) });
  if (a.burnKcal > 0) out.push({ type: "burn_kcal", target: Math.round(a.burnKcal) });
  if (a.logMeals) out.push({ type: "meal_log", target: 0 });
  if (a.mealCount > 0) out.push({ type: "meal_count", target: Math.round(a.mealCount) });
  if (a.intakeMax > 0) out.push({ type: "intake_max", target: Math.round(a.intakeMax) });
  if (a.proteinMin > 0) out.push({ type: "protein_min", target: Math.round(a.proteinMin) });
  // 중복 타입 제거(설문 특성상 없지만 방어).
  return sanitizeMissions(out);
}

/** 설문 답변 → 다짐 제목 자동 문구. */
export function surveyTitle(a: SurveyAnswers): string {
  const label: Record<SurveyGoal, string> = {
    lose: "체지방 감량 챌린지",
    gain: "근육 키우기 챌린지",
    maintain: "꾸준함 유지 챌린지",
    stamina: "체력 기르기 챌린지",
  };
  return label[a.goal];
}
