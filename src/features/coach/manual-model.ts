export const COACH_KINDS = ["recommendation", "habit-report", "consultation"] as const;
export type CoachKind = (typeof COACH_KINDS)[number];
export const COACH_KIND_LABELS: Record<CoachKind, string> = {
  recommendation: "오늘 운동 추천",
  "habit-report": "운동 습관 리포트",
  consultation: "헬스 상담",
};
export type CoachRequest = {
  id: string;
  kind: CoachKind;
  for_date: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
};
export function validateCoachRequest(kind: unknown, question: unknown): string | null {
  if (!COACH_KINDS.includes(kind as CoachKind)) return "요청 종류를 확인해 주세요.";
  if (typeof question !== "string" || question.trim().length > 2000) return "내용은 2,000자 이내로 입력해 주세요.";
  if (kind === "consultation" && question.trim().length < 2) return "상담할 내용을 입력해 주세요.";
  return null;
}

export const COACH_MINUTES = [20, 30, 45, 60] as const;
export const COACH_EQUIPMENT = { gym: "헬스장 기구 사용 가능", dumbbells: "덤벨만 사용 가능", bodyweight: "맨몸 운동만 가능" } as const;
export const COACH_PURPOSES = { today: "오늘 운동 구성", alternative: "대체 운동 찾기", plateau: "중량·횟수 정체 점검" } as const;
export type CoachPreferences = { minutes: number; equipment: keyof typeof COACH_EQUIPMENT; purpose: keyof typeof COACH_PURPOSES; exercise: string };
export const DEFAULT_COACH_PREFERENCES: CoachPreferences = { minutes: 30, equipment: "gym", purpose: "today", exercise: "" };

/** Validate again on the server; structured form values are untrusted input. */
export function prepareCoachQuestion(kind: CoachKind, question: string, raw?: unknown): { question: string; error: null } | { error: string } {
  const error = validateCoachRequest(kind, question);
  if (error) return { error };
  if (kind !== "recommendation" || raw === undefined) return { question: question.trim(), error: null };
  if (!raw || typeof raw !== "object") return { error: "추천 조건을 확인해 주세요." };
  const value = raw as Record<string, unknown>;
  if (!COACH_MINUTES.some(minutes => minutes === value.minutes) || typeof value.equipment !== "string" || !Object.hasOwn(COACH_EQUIPMENT, value.equipment) || typeof value.purpose !== "string" || !Object.hasOwn(COACH_PURPOSES, value.purpose) || typeof value.exercise !== "string" || value.exercise.trim().length > 100) return { error: "추천 조건을 확인해 주세요." };
  const prefs = value as CoachPreferences;
  if (prefs.purpose !== "today" && !prefs.exercise.trim()) return { error: "대체하거나 점검할 운동을 입력해 주세요." };
  const combined = `[추천 조건]\n가능한 시간: ${prefs.minutes}분\n사용 기구: ${COACH_EQUIPMENT[prefs.equipment]}\n요청 목적: ${COACH_PURPOSES[prefs.purpose]}${prefs.exercise.trim() ? `\n대상 운동: ${prefs.exercise.trim()}` : ""}\n\n${question.trim()}`;
  if (combined.length > 2000) return { error: "추천 조건을 포함해 2,000자 이내로 입력해 주세요." };
  return { question: combined.trim(), error: null };
}