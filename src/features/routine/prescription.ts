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
