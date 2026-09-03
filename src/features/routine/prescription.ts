/**
 * 처방(세트×횟수×무게) — 운동 + 체형/성별/경력 → 권장 세트·횟수·무게.
 *
 * **운동 목록 데이터와 분리해 둔다.** 필요한 건 강도 등급(`loadClassOf`) 하나뿐인데,
 * 예전엔 `exercise-catalog.ts` 안에 있어서 추천 채우기 버튼 하나 때문에 루틴 편집기가
 * 카탈로그 1,237개(274 KiB)를 통째로 끌고 왔다.
 * (`exercise-catalog.ts` 가 재수출하므로 기존 import 경로는 그대로 동작한다.)
 */

import { loadClassOf, type LoadClass } from "@/features/routine/exercise-load";

export type Prescription = {
  sets: number;
  reps: number;
  /** 권장 무게(kg). 맨몸 운동이면 null */
  weightKg: number | null;
};

const REPS: Record<
  "beginner" | "intermediate" | "advanced",
  { heavy: number; other: number }
> = {
  beginner: { heavy: 12, other: 15 },
  intermediate: { heavy: 10, other: 12 },
  advanced: { heavy: 6, other: 10 },
};

const SETS = { beginner: 3, intermediate: 4, advanced: 4 } as const;

/**
 * 이 사람이 이 종목에서 **채워야 하는 목표 횟수**.
 *
 * `prescribe` 가 내부에서 쓰던 값과 같은 것을 밖으로 낸다 — 점진적 과부하 추천이
 * "목표를 채웠나"를 판단하려면 처방과 **같은 기준**을 봐야 한다. 여기가 갈라지면
 * 계획은 10회를 시키는데 추천은 12회를 기다리는 식으로 어긋난다.
 */
export function targetReps(
  exerciseId: string,
  experience: "beginner" | "intermediate" | "advanced",
): number {
  return loadClassOf(exerciseId) === "heavy"
    ? REPS[experience].heavy
    : REPS[experience].other;
}

/** 체중 대비 기본 부하 비율(중급 남성 기준) */
const LOAD_FRACTION: Record<LoadClass, number> = {
  heavy: 0.6,
  medium: 0.4,
  light: 0.15,
  bodyweight: 0,
};

/**
 * 운동 + 체형/성별/경력 → 권장 세트·횟수·무게.
 * 휴리스틱이며 시작점 제안용(이후 사용자가 직접 조정 가능).
 */
export function prescribe(
  exerciseId: string,
  opts: {
    gender: "male" | "female";
    experience: "beginner" | "intermediate" | "advanced";
    bodyType: "lean" | "average" | "heavy";
    weightKg: number;
  },
): Prescription {
  const loadClass = loadClassOf(exerciseId);
  const sets = SETS[opts.experience];
  const reps =
    loadClass === "heavy"
      ? REPS[opts.experience].heavy
      : REPS[opts.experience].other;

  if (loadClass === "bodyweight") {
    return { sets, reps, weightKg: null };
  }

  const expFactor =
    opts.experience === "beginner"
      ? 0.7
      : opts.experience === "advanced"
        ? 1.3
        : 1;
  const genderFactor = opts.gender === "female" ? 0.65 : 1;
  const bodyFactor =
    opts.bodyType === "lean" ? 0.9 : opts.bodyType === "heavy" ? 1.05 : 1;

  const raw =
    opts.weightKg *
    LOAD_FRACTION[loadClass] *
    expFactor *
    genderFactor *
    bodyFactor;

  // 2.5kg 단위로 반올림, 최소 2.5kg
  const weightKg = Math.max(2.5, Math.round(raw / 2.5) * 2.5);
  return { sets, reps, weightKg };
}
