/**
 * 근육별 운동선택(3D 마네킹) 데이터 레이어 — 순수 모듈.
 *
 * 3D 마네킹에서 근육 부위를 클릭하면 그 부위에 매핑된 운동들을 보여주기 위한
 * 정의. 부위(BodyPart)는 이미 카탈로그가 쓰는 6개 그룹(가슴/등/어깨/팔/하체/코어)
 * 을 그대로 쓴다. 각 부위는 저장용 focus(=동일 문자열, 모두 유효한 FocusKey)와
 * 1:1 대응하며, 운동 목록은 카탈로그의 1차 부위 그룹핑을 재사용한다.
 *
 * three.js 같은 렌더링 코드는 여기 들어오지 않는다(순수·테스트 가능 유지).
 */

import type { FocusKey } from "@/features/routine/exercise-catalog";
import {
  BODY_PART_LABEL,
  BODY_PART_ORDER,
  bodyPartsFor,
  groupedByBodyPart,
  type BodyPart,
  type CatalogExercise,
} from "@/features/routine/exercise-catalog";

/** 마네킹에서 클릭 가능한 근육 부위 — 카탈로그 BodyPart 와 동일한 6개. */
export type MuscleId = BodyPart;

/** 부위가 인체의 앞/뒤 어느 면에서 주로 보이는지 (마네킹 카메라·범례용). */
export type BodySide = "front" | "back" | "both";

export type MuscleGroup = {
  id: MuscleId;
  /** 한국어 라벨 (가슴/등/…) */
  label: string;
  /** 저장·운동조회에 쓰는 focus 키. 6개 atomic 부위는 id 와 동일. */
  focus: FocusKey;
  /** 인체에서 주로 드러나는 면 */
  side: BodySide;
  /** three.js 머티리얼용 기본 색(hex). BODY_PART_TONE 색조와 맞춤. */
  color: string;
  /** 클릭 시 보여줄 대표 근육 한국어 설명 */
  muscles: string[];
};

/**
 * 6개 근육 부위 정의. BodyPart 와 FocusKey 가 같은 문자열이라 focus=id.
 * (chest/back/shoulder/arm/lower/core 는 모두 FocusKey 에 존재)
 */
export const MUSCLE_GROUPS: MuscleGroup[] = [
  {
    id: "chest",
    label: BODY_PART_LABEL.chest,
    focus: "chest",
    side: "front",
    color: "#f43f5e", // rose-500
    muscles: ["대흉근(상·중·하부)", "전면 삼각근", "삼두(보조)"],
  },
  {
    id: "back",
    label: BODY_PART_LABEL.back,
    focus: "back",
    side: "back",
    color: "#0ea5e9", // sky-500
    muscles: ["광배근", "승모근", "능형근", "척추기립근"],
  },
  {
    id: "shoulder",
    label: BODY_PART_LABEL.shoulder,
    focus: "shoulder",
    side: "both",
    color: "#f59e0b", // amber-500
    muscles: ["전면·측면·후면 삼각근", "승모근(상부)"],
  },
  {
    id: "arm",
    label: BODY_PART_LABEL.arm,
    focus: "arm",
    side: "both",
    color: "#8b5cf6", // violet-500
    muscles: ["이두", "삼두", "전완"],
  },
  {
    id: "lower",
    label: BODY_PART_LABEL.lower,
    focus: "lower",
    side: "both",
    color: "#14b8a6", // teal-500
    muscles: ["대퇴사두", "햄스트링", "둔근", "종아리"],
  },
  {
    id: "core",
    label: BODY_PART_LABEL.core,
    focus: "core",
    side: "front",
    color: "#d946ef", // fuchsia-500
    muscles: ["복근", "복사근", "코어 안정근"],
  },
];

/** id → MuscleGroup 빠른 조회 */
const BY_ID: Record<MuscleId, MuscleGroup> = Object.fromEntries(
  MUSCLE_GROUPS.map((m) => [m.id, m]),
) as Record<MuscleId, MuscleGroup>;

/** 마네킹 부위 순서 — 카탈로그 BODY_PART_ORDER 와 동일하게 유지. */
export const MUSCLE_ORDER: MuscleId[] = [...BODY_PART_ORDER];

/** 값이 유효한 근육 부위 id 인지 */
export function isMuscleId(value: unknown): value is MuscleId {
  return typeof value === "string" && value in BY_ID;
}

/** id 로 근육 그룹 조회 (없으면 undefined) */
export function muscleGroup(id: MuscleId): MuscleGroup {
  return BY_ID[id];
}

/**
 * 한 근육 부위에 매핑된 모든 카탈로그 운동.
 * 카탈로그의 1차 부위(primaryBodyPart) 그룹핑을 그대로 사용한다.
 */
export function exercisesForMuscle(id: MuscleId): CatalogExercise[] {
  return groupedByBodyPart()[id] ?? [];
}

/** 한 근육 부위의 운동 개수 */
export function exerciseCountForMuscle(id: MuscleId): number {
  return exercisesForMuscle(id).length;
}

/**
 * 운동 id → 이 운동을 클릭으로 도달할 수 있는 근육 부위들.
 * (주 부위 + 보조 부위. 마네킹에서 어느 근육을 눌러야 이 운동이 나오는지)
 */
export function musclesForExercise(exerciseId: string): MuscleId[] {
  return bodyPartsFor(exerciseId);
}