/**
 * 보기 좋은 몸의 목표 비율 — 세부 근육별 **주간 유효 세트** 목표(중급 기준).
 * 맞춤 운동 1단계(2026-10-01, `docs/sub-muscle-score-lite-plan-2026-10-01.html` 2-1).
 *
 * 모든 근육을 똑같이 채우지 않는다. 남성은 V자(어깨 옆·광배·가슴 상부, 삼두 8 : 이두 4.5),
 * 여성은 하체·둔근 중심 + 자세 라인(둔근 8, 하체 22, 등 12, 삼두 6 : 이두 3).
 * 숫자는 판단으로 정한 시작값이다 — 이 표 하나만 고치면 추천 전체가 따라온다.
 *
 * 유효 세트 = 세트 × 점수 ÷ 100(`exercise-stimulus.ts`), 보조 자극 포함.
 */
import type { ExperienceLevel, Gender } from "@/features/profile/data";

export type BodyStyle = "male" | "female" | "balanced";

const MALE: Record<string, number> = {
  "chest-upper": 5, "chest-mid": 4, "chest-lower": 2, "chest-inner": 1,
  "back-lats": 7, "back-rhomboids": 4, "back-traps": 2, "back-erector": 2,
  "shoulder-front": 2, "shoulder-side": 6, "shoulder-rear": 4,
  "arm-triceps-long": 4, "arm-triceps-lateral": 2.5, "arm-triceps-medial": 1.5,
  "arm-biceps-long": 2.5, "arm-biceps-short": 2, "arm-forearm": 1.5,
  "lower-quads": 6, "lower-hamstrings": 4, "lower-glutes": 4, "lower-adductors": 1.5, "lower-calves": 3,
  "core-upper-abs": 2, "core-lower-abs": 2, "core-obliques": 1.5,
};

const FEMALE: Record<string, number> = {
  "chest-upper": 2, "chest-mid": 2, "chest-lower": 1, "chest-inner": 0.5,
  "back-lats": 5, "back-rhomboids": 4, "back-traps": 1, "back-erector": 2,
  "shoulder-front": 1.5, "shoulder-side": 5, "shoulder-rear": 4,
  "arm-triceps-long": 3, "arm-triceps-lateral": 1.5, "arm-triceps-medial": 1.5,
  "arm-biceps-long": 1.5, "arm-biceps-short": 1.5, "arm-forearm": 0.5,
  "lower-quads": 5, "lower-hamstrings": 5, "lower-glutes": 8, "lower-adductors": 2, "lower-calves": 2,
  "core-upper-abs": 2, "core-lower-abs": 2.5, "core-obliques": 2,
};

/** 고르게 — 두 표의 평균(성별로 정해 버리지 않으려는 사람). */
const BALANCED: Record<string, number> = Object.fromEntries(
  Object.keys(MALE).map((k) => [k, Math.round(((MALE[k] + FEMALE[k]) / 2) * 4) / 4]),
);

export const BODY_TARGETS: Record<BodyStyle, Readonly<Record<string, number>>> = {
  male: MALE,
  female: FEMALE,
  balanced: BALANCED,
};

/** 경력 배율 — 비율은 그대로, 양만. */
export const EXPERIENCE_SCALE: Record<ExperienceLevel, number> = {
  beginner: 0.6,
  intermediate: 1,
  advanced: 1.25,
};

/** 기본 스타일 — 성별. (설정에서 바꾸는 칸은 다음 단계) */
export function defaultStyle(gender: Gender | null | undefined): BodyStyle {
  return gender === "female" ? "female" : "male";
}

/** 세부 근육별 이번 주 목표(유효 세트). 소수 첫째 자리. */
export function weeklyTargets(
  style: BodyStyle,
  experience: ExperienceLevel | null | undefined,
): Record<string, number> {
  const scale = EXPERIENCE_SCALE[experience ?? "intermediate"] ?? 1;
  return Object.fromEntries(
    Object.entries(BODY_TARGETS[style]).map(([k, v]) => [k, Math.round(v * scale * 10) / 10]),
  );
}

export function sumTargets(t: Readonly<Record<string, number>>, prefix = ""): number {
  return Math.round(
    Object.entries(t)
      .filter(([k]) => k.startsWith(prefix))
      .reduce((s, [, v]) => s + v, 0) * 10,
  ) / 10;
}
