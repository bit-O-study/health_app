/**
 * 가입 설문 3문항 + 몸 목표 스타일 — 2026-10-01(`docs/lite-app-ui-2026-10-01.html`). 순수 모듈.
 *
 *  - 나이대: 칼로리(기초대사량) 계산에 쓴다 — 예전엔 모두 30세로 가정했다.
 *  - 몸 목표 스타일: 맞춤 운동 목표 비율 표를 고른다. **성별로 정해 버리지 않게** 사용자가 바꾼다.
 *  - 1회 운동 시간: 맞춤 운동 추천 개수 · AI 트레이너 기본 시간.
 */
import type { Gender } from "@/features/profile/data";
import type { BodyStyle } from "@/features/routine/body-targets";

export type AgeGroup = "10s" | "20s" | "30s" | "40s" | "50plus";
export const AGE_GROUPS: { id: AgeGroup; label: string; age: number }[] = [
  { id: "10s", label: "10대", age: 17 },
  { id: "20s", label: "20대", age: 25 },
  { id: "30s", label: "30대", age: 35 },
  { id: "40s", label: "40대", age: 45 },
  { id: "50plus", label: "50대 이상", age: 57 },
];
export function isAgeGroup(v: unknown): v is AgeGroup {
  return AGE_GROUPS.some((g) => g.id === v);
}
/** 나이대 → 계산에 쓰는 대표 나이. 모르면 null(호출부가 30세로). */
export function ageOf(group: AgeGroup | null | undefined): number | null {
  return AGE_GROUPS.find((g) => g.id === group)?.age ?? null;
}

export type BodyStyleChoice = "upper" | "lower" | "balanced";
export const BODY_STYLE_OPTIONS: { id: BodyStyleChoice; label: string; description: string }[] = [
  { id: "upper", label: "상체 위주", description: "넓은 어깨·등·가슴 — V자 라인" },
  { id: "lower", label: "하체 위주", description: "힙·허벅지 라인과 바른 자세" },
  { id: "balanced", label: "고르게", description: "위아래 균형 있게" },
];
export function isBodyStyleChoice(v: unknown): v is BodyStyleChoice {
  return BODY_STYLE_OPTIONS.some((o) => o.id === v);
}
/** 고르기 전 기본값 — 성별(남 상체 위주 · 여 하체 위주). */
export function defaultBodyStyleChoice(gender: Gender | null | undefined): BodyStyleChoice {
  return gender === "female" ? "lower" : "upper";
}
/** 스타일 → 목표 비율 표. 안 골랐으면 성별 표. */
export function targetStyleFor(choice: BodyStyleChoice | null | undefined, gender: Gender | null | undefined): BodyStyle {
  if (choice === "upper") return "male";
  if (choice === "lower") return "female";
  if (choice === "balanced") return "balanced";
  return gender === "female" ? "female" : "male";
}

export type SessionMinutes = 30 | 45 | 60;
export const SESSION_MINUTES: { id: SessionMinutes; label: string }[] = [
  { id: 30, label: "30분" },
  { id: 45, label: "45분" },
  { id: 60, label: "60분 이상" },
];
export function isSessionMinutes(v: unknown): v is SessionMinutes {
  return v === 30 || v === 45 || v === 60;
}
/** 맞춤 운동 추천 개수 — 30분 2개 · 45분 3개 · 60분 4개(모르면 3개). */
export function fitPickCount(minutes: SessionMinutes | null | undefined): number {
  if (minutes === 30) return 2;
  if (minutes === 60) return 4;
  return 3;
}

export type SurveyExtra = {
  ageGroup: AgeGroup | null;
  bodyStyle: BodyStyleChoice | null;
  sessionMinutes: SessionMinutes | null;
};

/** 저장 전 검사 — 모르는 값은 null 로(잘못된 값으로 저장 실패시키지 않는다). */
export function cleanSurveyExtra(v: Partial<Record<keyof SurveyExtra, unknown>> | null | undefined): SurveyExtra {
  return {
    ageGroup: isAgeGroup(v?.ageGroup) ? v.ageGroup : null,
    bodyStyle: isBodyStyleChoice(v?.bodyStyle) ? v.bodyStyle : null,
    sessionMinutes: isSessionMinutes(v?.sessionMinutes) ? v.sessionMinutes : null,
  };
}

/** 1회 운동에 들어가는 운동 수 — 30분 4개 · 45분 6개 · 60분 8개(모르면 6개). 오늘 운동이 이만큼 차면 더 추천하지 않는다. */
export function sessionCapacity(minutes: SessionMinutes | null | undefined): number {
  if (minutes === 30) return 4;
  if (minutes === 60) return 8;
  return 6;
}
