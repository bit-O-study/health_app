/**
 * 온보딩 입력값과 코드 기반 추천 규칙.
 *
 * (성별, 경력) → 분할 루틴 매핑은 여기 한 곳에만 둔다. variantId/splits 는
 * src/features/routine/data.ts 의 SPLIT_PRESETS 카탈로그 id 를 그대로 가리킨다.
 */

export type Gender = "male" | "female";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export const GENDER_OPTIONS: { id: Gender; label: string }[] = [
  { id: "male", label: "남자" },
  { id: "female", label: "여자" },
];

export const EXPERIENCE_OPTIONS: {
  id: ExperienceLevel;
  label: string;
  description: string;
}[] = [
  {
    id: "beginner",
    label: "초급",
    description: "운동 시작 1년 미만 · 기본 동작을 익히는 단계",
  },
  {
    id: "intermediate",
    label: "중급",
    description: "꾸준히 1~3년 · 분할 운동 경험이 있는 단계",
  },
  {
    id: "advanced",
    label: "고급",
    description: "3년 이상 · 부위별 고볼륨 훈련이 가능한 단계",
  },
];

export function isGender(value: unknown): value is Gender {
  return value === "male" || value === "female";
}

export function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return (
    value === "beginner" || value === "intermediate" || value === "advanced"
  );
}

export type BodyType = "lean" | "average" | "heavy";

export const BODY_TYPE_OPTIONS: {
  id: BodyType;
  label: string;
  description: string;
}[] = [
  { id: "lean", label: "마른형", description: "체지방·근육량이 적은 편" },
  { id: "average", label: "표준형", description: "보통 체형" },
  { id: "heavy", label: "통통형", description: "체지방이 있는 편" },
];

export function isBodyType(value: unknown): value is BodyType {
  return value === "lean" || value === "average" || value === "heavy";
}

export type BodyMetrics = {
  heightCm: number;
  weightKg: number;
  bodyType: BodyType;
};

export type Recommendation = {
  splits: number;
  variantId: string;
  /** 추천 한 줄 제목 */
  headline: string;
  /** 왜 이 루틴인지 설명 */
  reason: string;
};

/**
 * (성별, 경력) → 추천 분할 루틴.
 *
 * 경력이 큰 축이고, 고급에서만 성별로 변형을 살짝 다르게 잡는다.
 */
export function recommendRoutine(
  gender: Gender,
  experience: ExperienceLevel,
): Recommendation {
  if (experience === "beginner") {
    return {
      splits: 1,
      variantId: "fullbody-3",
      headline: "무분할 전신 · 주 3회",
      reason:
        "입문 단계에선 한 번에 전신을 자극하고 회복일을 넉넉히 두는 편이 동작 습득과 부상 예방에 가장 효율적입니다.",
    };
  }

  if (experience === "intermediate") {
    return {
      splits: 3,
      variantId: "cbl-3",
      headline: "3분할 가슴·등·하체 · 주 3회",
      reason:
        "어느 정도 적응된 단계에선 부위별 회복을 확보하면서 볼륨을 늘리기 좋은 클래식 3분할이 무난합니다.",
    };
  }

  // advanced
  if (gender === "female") {
    return {
      splits: 5,
      variantId: "bro-5-alt",
      headline: "5분할 (하체 우선 배치) · 주 5회",
      reason:
        "고급 단계에선 부위별 집중도가 높은 5분할이 적합합니다. 하체 비중을 앞쪽에 배치한 변형으로 추천합니다.",
    };
  }

  return {
    splits: 5,
    variantId: "bro-5",
    headline: "5분할 브로 스플릿 · 주 5회",
    reason:
      "고급 단계에선 한 부위에 집중하는 5분할로 부위별 볼륨을 극대화하는 구성이 적합합니다.",
  };
}
