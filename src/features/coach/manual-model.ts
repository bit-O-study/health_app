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
