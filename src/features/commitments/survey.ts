/**
 * 다짐 설문 — 순수 로직(답변 → 미션·목표치).
 *
 * 설계(2026-09-25): **이미 아는 건 묻지 않고, 숫자는 묻지 않고 계산한다.**
 * 목표·경력·체중·주당 운동일은 온보딩과 루틴에 있으므로 설문은 네 가지만 묻는다.
 *  1) 기간   2) 뭐가 자주 무너지나(= 미션이 된다)   3) 하루 운동 시간   4) 주 며칠
 * (알림 시각은 화면에서 같이 받되 계산에는 쓰이지 않는다.)
 *
 * 그리고 모든 숫자에 **왜 그 숫자인지**(`why`)를 붙여 저장한다. 화면마다 문구를 새로
 * 만들면 홈·다짐·성적표가 서로 다른 설명을 하게 된다.
 */

import type { MissionSpec } from "@/features/commitments/missions";

/** Q2 — 자주 무너지는 것. 이게 그대로 미션이 된다. */
export type BreakId =
  | "late" // 야식
  | "drink" // 술
  | "skip" // 식사 거르기
  | "nogym" // 운동 빼먹기
  | "water" // 물 안 마심
  | "sleep" // 늦게 자기
  | "binge" // 폭식
  | "sit"; // 종일 앉아있기

export const BREAK_OPTIONS: { id: BreakId; emoji: string; label: string }[] = [
  { id: "late", emoji: "🌙", label: "야식" },
  { id: "drink", emoji: "🍺", label: "술" },
  { id: "skip", emoji: "🍽️", label: "식사 거르기" },
  { id: "nogym", emoji: "🏃", label: "운동 빼먹기" },
  { id: "water", emoji: "💧", label: "물 안 마심" },
  { id: "sleep", emoji: "😴", label: "늦게 자기" },
  { id: "binge", emoji: "🍚", label: "폭식" },
  { id: "sit", emoji: "🪑", label: "종일 앉아있기" },
];

export function isBreakId(v: unknown): v is BreakId {
  return BREAK_OPTIONS.some((b) => b.id === v);
}

/** 하루에 운동으로 쓸 수 있는 시간(분). */
export type TimeBudget = 15 | 30 | 60;

export type SurveyInput = {
  weeks: 2 | 4 | 8;
  breaks: BreakId[];
  minutes: TimeBudget;
  /** 주 며칠 지킬지. 기본은 루틴의 주당 운동일. */
  perWeek: number;
  /** "20:00" 또는 null(알림 없음). 계산에는 안 쓰고 그대로 저장한다. */
  remindAt: string | null;
};

/** 계산에 쓰는, **이미 앱이 아는** 값들. 설문에서 다시 묻지 않는다. */
export type KnownProfile = {
  gender: "male" | "female";
  experience: "beginner" | "intermediate" | "advanced";
  weightKg: number;
  goal: "lose" | "gain" | "maintain" | "stamina";
  /** 앱이 계산 중인 하루 권장 섭취(kcal). */
  recommendKcal: number;
};

/** 하루에 담을 수 있는 미션 수 — 많아지면 달성률이 희석되고 무엇을 안 했는지 가려진다. */
export const MAX_MISSIONS = 3;
/** Q2 에서 고를 수 있는 개수. */
export const MAX_BREAKS = 3;

/** 경력 계수 — 같은 시간을 써도 초보와 고급의 몸이 다르다. */
const EXP_K: Record<KnownProfile["experience"], number> = {
  beginner: 0.8,
  intermediate: 1.0,
  advanced: 1.15,
};

/** 섭취 상한의 하한 — 이 밑으로는 절대 제안하지 않는다(건강 문제). */
export const INTAKE_FLOOR: Record<KnownProfile["gender"], number> = {
  female: 1200,
  male: 1500,
};

const round = (v: number, unit: number) => Math.round(v / unit) * unit;

/** 소비 kcal — 체중 × 시간계수 × 경력계수. 10 단위. */
export function burnTarget(me: KnownProfile, minutes: TimeBudget): number {
  const t = minutes === 15 ? 2.5 : minutes === 60 ? 6 : 4;
  return Math.max(50, round(me.weightKg * t * EXP_K[me.experience], 10));
}

/** 섭취 상한 — 권장 섭취에서 적자만큼. 주 며칠을 지킬지에 따라 적자가 다르다. 50 단위. */
export function intakeTarget(me: KnownProfile, perWeek: number): number {
  const deficit = perWeek <= 3 ? 0.1 : perWeek >= 7 ? 0.2 : 0.15;
  return Math.max(INTAKE_FLOOR[me.gender], round(me.recommendKcal * (1 - deficit), 50));
}

/** 단백질 — 체중 × 목표별 계수. 5 단위. */
export function proteinTarget(me: KnownProfile): number {
  const k = me.goal === "gain" ? 1.6 : me.goal === "lose" ? 1.5 : 1.2;
  return Math.max(20, round(me.weightKg * k, 5));
}

/** 유산소 분 — 시간 예산 × 경력계수. 5 단위. */
export function cardioTarget(me: KnownProfile, minutes: TimeBudget): number {
  const base = minutes === 15 ? 15 : minutes === 60 ? 40 : 25;
  return Math.max(10, round(base * EXP_K[me.experience], 5));
}

/** 목표별로 **항상 하나는 들어가는** 기본 미션 — Q2 를 건너뛰어도 다짐이 비지 않게. */
function baseMission(me: KnownProfile, input: SurveyInput): MissionSpec {
  const why = `${me.weightKg}kg · 하루 ${input.minutes}분 · ${
    { beginner: "초급", intermediate: "중급", advanced: "고급" }[me.experience]
  }`;
  if (me.goal === "gain") {
    return { type: "protein_min", target: proteinTarget(me), why: "체중 × 1.6 — 증량" };
  }
  if (me.goal === "maintain") {
    return { type: "workout_today", target: 0, why: "유지 목표의 기본" };
  }
  if (me.goal === "stamina") {
    return {
      type: "cardio_min",
      target: cardioTarget(me, input.minutes),
      why: "체력 목표의 기본",
    };
  }
  return { type: "burn_kcal", target: burnTarget(me, input.minutes), why };
}

/** 고른 항목 하나 → 미션 하나. 판정할 수 있으면 자동, 아니면 수동 체크. */
function breakToMission(
  id: BreakId,
  me: KnownProfile,
  input: SurveyInput,
): MissionSpec | null {
  const manual = (label: string): MissionSpec => ({
    type: "manual_check",
    target: 0,
    label,
    why: "앱이 판정할 수 없어요 — 직접 체크",
  });
  switch (id) {
    case "late":
      return { type: "no_late_snack", target: intakeTarget(me, input.perWeek), why: "자주 무너진다고 고른 항목" };
    case "skip":
      return {
        type: "meal_count",
        target: me.goal === "gain" ? 4 : 3,
        why: "식사를 거르지 않게",
      };
    case "nogym":
      return { type: "workout_today", target: 0, why: "휴식일은 면제돼요" };
    case "binge":
      // 증량 중 섭취 상한은 역효과다 — 끼니 수로 바꾼다.
      return me.goal === "gain"
        ? { type: "meal_count", target: 4, why: "증량 중엔 상한 대신 끼니 수로" }
        : {
            type: "intake_max",
            target: intakeTarget(me, input.perWeek),
            why: `권장 ${me.recommendKcal.toLocaleString()}kcal 에서 감량 적자`,
          };
    case "sit":
      return {
        type: "cardio_min",
        target: cardioTarget(me, input.minutes),
        why: `하루 ${input.minutes}분 예산에서`,
      };
    case "drink":
      return manual("술 안 마시기");
    case "water":
      return manual("물 2L 마시기");
    case "sleep":
      return manual("12시 전에 자기");
    default:
      return null;
  }
}

/**
 * 설문 답변 → 미션 목록(최대 3개).
 * 기본 미션이 먼저 들어가고, 고른 항목이 뒤를 채운다. 같은 미션은 한 번만.
 */
export function buildMissions(me: KnownProfile, input: SurveyInput): MissionSpec[] {
  const out: MissionSpec[] = [baseMission(me, input)];
  const key = (m: MissionSpec) =>
    m.type === "manual_check" ? `manual:${m.label}` : m.type;
  const seen = new Set<string>([key(out[0])]);

  for (const id of input.breaks.slice(0, MAX_BREAKS)) {
    if (out.length >= MAX_MISSIONS) break;
    const m = breakToMission(id, me, input);
    if (!m) continue;
    const k = key(m);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(m);
  }
  return out.slice(0, MAX_MISSIONS).map((m, i) => ({ ...m, id: `m${i + 1}` }));
}

/** 다짐 제목 — 기간과 목표에서. 사용자가 고칠 수 있다. */
export function surveyTitleOf(me: KnownProfile, weeks: number): string {
  const goal = {
    lose: "감량",
    gain: "증량",
    maintain: "유지",
    stamina: "체력",
  }[me.goal];
  return `${weeks}주 ${goal} 다짐`;
}

/** 시작일(YYYY-MM-DD) + 주 수 → 마감일. 시작일 포함 weeks*7 일. */
export function deadlineOf(startYmd: string, weeks: number): string {
  const [y, m, d] = startYmd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + weeks * 7 - 1);
  return dt.toISOString().slice(0, 10);
}

/* ── 입력 방어 ───────────────────────────────────────────────────────────
 * 설문은 클라이언트에서 오므로 서버에서 한 번 더 거른다. 이상한 값이 오면
 * **거절하지 않고 기본값으로 떨어뜨린다** — 설문을 처음부터 다시 시키지 않으려고.
 */

const WEEKS: SurveyInput["weeks"][] = [2, 4, 8];
const MINUTES: TimeBudget[] = [15, 30, 60];
/** "HH:MM" 24시간. */
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function sanitizeSurveyInput(
  raw: Partial<SurveyInput> | null | undefined,
  me: KnownProfile,
  defaultPerWeek = 5,
): SurveyInput {
  const weeks = WEEKS.includes(raw?.weeks as SurveyInput["weeks"])
    ? (raw!.weeks as SurveyInput["weeks"])
    : 4;
  const minutes = MINUTES.includes(raw?.minutes as TimeBudget)
    ? (raw!.minutes as TimeBudget)
    : 30;
  const perWeekRaw = Number(raw?.perWeek);
  const perWeek =
    Number.isFinite(perWeekRaw) && perWeekRaw >= 1 && perWeekRaw <= 7
      ? Math.round(perWeekRaw)
      : Math.min(7, Math.max(1, defaultPerWeek));
  const breaks = Array.isArray(raw?.breaks)
    ? [...new Set(raw!.breaks.filter(isBreakId))].slice(0, MAX_BREAKS)
    : [];
  const remindAt =
    typeof raw?.remindAt === "string" && HHMM.test(raw.remindAt) ? raw.remindAt : null;
  // me 는 계산에만 쓰이고 입력 검증에는 관여하지 않는다 — 시그니처를 맞추기 위해 받는다.
  void me;
  return { weeks, breaks, minutes, perWeek, remindAt };
}

/** 프로필의 목표(4종) → 설문이 쓰는 목표. 체력 목표는 프로필에 없어 유지로 본다. */
export function toSurveyGoal(
  goal: "weight_loss" | "fat_loss" | "muscle_gain" | "maintain" | null | undefined,
): KnownProfile["goal"] {
  if (goal === "muscle_gain") return "gain";
  if (goal === "weight_loss" || goal === "fat_loss") return "lose";
  return "maintain";
}

/**
 * 루틴에서 '주 며칠 운동하는지' 를 읽는다 — 설문의 '주 며칠' 기본값.
 * 커스텀 루틴이면 휴식이 아닌 요일 수, 아니면 분할 수(splits). 읽을 수 없으면 5.
 */
export function weeklyWorkoutDays(
  routine: { splits: number; customWeek: string[][] | null } | null | undefined,
): number {
  if (!routine) return 5;
  if (routine.customWeek) {
    const days = routine.customWeek.filter(
      (blocks) => blocks.length > 0 && !blocks.every((b) => b === "rest"),
    ).length;
    return Math.min(7, Math.max(1, days || 5));
  }
  return routine.splits >= 1 && routine.splits <= 7 ? routine.splits : 5;
}
