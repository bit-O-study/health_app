/** 월경 공용 타입·상수 — 서버/클라이언트 공용(server-only 아님). */

export type Flow = "spotting" | "light" | "medium" | "heavy";

export const FLOWS: Flow[] = ["spotting", "light", "medium", "heavy"];
export const FLOW_LABEL: Record<Flow, string> = {
  spotting: "점상",
  light: "적음",
  medium: "보통",
  heavy: "많음",
};

/** 자주 쓰는 증상 칩 */
export const SYMPTOMS: string[] = [
  "생리통",
  "두통",
  "허리통증",
  "복부팽만",
  "유방통",
  "피로",
  "여드름",
  "식욕증가",
  "기분변화",
  "메스꺼움",
];

export type CycleLog = {
  forDate: string;
  isPeriod: boolean;
  flow: Flow | null;
  symptoms: string[];
  note: string | null;
};
