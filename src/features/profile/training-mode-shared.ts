/** 학습 모드 공용 상수/타입 — 서버(루트 페이지·액션)·클라(선택 UI) 모두 import. */

export type TrainingMode = "routine" | "powerlifting";

/** 서버가 읽어 리다이렉트하는 durable 쿠키명. */
export const MODE_COOKIE = "training_mode";

/** 쿠키 유지 기간(초) — 약 10년. */
export const MODE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 10;

export const MODE_HREF: Record<TrainingMode, string> = {
  routine: "/routine",
  powerlifting: "/powerlifting",
};

export function isTrainingMode(v: unknown): v is TrainingMode {
  return v === "routine" || v === "powerlifting";
}
