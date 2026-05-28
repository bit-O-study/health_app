/**
 * 체성분(분석지 기반) 데이터 + 마네킹 부위 매핑 + 추천 루틴 헬퍼.
 * 의료 진단을 하지 않으며 피트니스 가이드에 한정해 사용한다.
 */

import type { BodyRegion } from "@/features/routine/components/mannequin";
import {
  recommendRoutine,
  type ExperienceLevel,
  type Gender,
} from "@/features/profile/data";

export type BodyComp = {
  measuredAt: string;
  weightKg: number | null;
  skeletalMuscleKg: number | null;
  bodyFatKg: number | null;
  bodyFatPct: number | null;
  muscleRightArm: number | null;
  muscleLeftArm: number | null;
  muscleTrunk: number | null;
  muscleRightLeg: number | null;
  muscleLeftLeg: number | null;
  fatRightArm: number | null;
  fatLeftArm: number | null;
  fatTrunk: number | null;
  fatRightLeg: number | null;
  fatLeftLeg: number | null;
  imagePath: string | null;
};

/** 5분류(우상지/좌상지/체간/우하지/좌하지) → 마네킹 6 region 으로 가중 매핑 */
export function regionScoresFromBodyComp(
  c: BodyComp,
): Record<BodyRegion, number> {
  const arm = (c.muscleRightArm ?? 0) + (c.muscleLeftArm ?? 0);
  const leg = (c.muscleRightLeg ?? 0) + (c.muscleLeftLeg ?? 0);
  const trunk = c.muscleTrunk ?? 0;
  return {
    chest: trunk * 0.35,
    back: trunk * 0.3,
    shoulder: arm * 0.25,
    arm: arm * 0.75,
    leg,
    core: trunk * 0.35,
  };
}

export type RoutineRecommendation = {
  splits: number;
  variantId: string;
  headline: string;
  reason: string;
  source: "body" | "profile";
};

/** 체성분 기반 추천 — 가장 약한 부위 보강에 초점 */
export function recommendByBodyComp(c: BodyComp): RoutineRecommendation {
  const r = regionScoresFromBodyComp(c);
  const entries = (Object.entries(r) as [BodyRegion, number][]).filter(
    ([, v]) => v > 0,
  );
  if (entries.length === 0) {
    return {
      splits: 3,
      variantId: "cbl-3",
      headline: "3일 루틴 · 가슴/등/하체",
      reason: "체성분 수치가 부족해 기본 추천을 제공합니다.",
      source: "body",
    };
  }
  entries.sort((a, b) => a[1] - b[1]);
  const weakest = entries[0][0];
  switch (weakest) {
    case "leg":
      return {
        splits: 3,
        variantId: "cbl-3",
        headline: "3일 루틴 · 가슴/등/하체",
        reason: "하체가 상대적으로 약합니다. 하체 데이가 포함된 루틴 추천.",
        source: "body",
      };
    case "arm":
      return {
        splits: 5,
        variantId: "bro-5",
        headline: "5일 루틴 · 브로 스플릿",
        reason: "팔이 상대적으로 약합니다. 부위별 5일 루틴으로 팔 볼륨을 늘리세요.",
        source: "body",
      };
    case "shoulder":
      return {
        splits: 4,
        variantId: "cbsl-4",
        headline: "4일 루틴 · 가슴/등/어깨/하체",
        reason: "어깨가 상대적으로 약합니다. 어깨를 단독으로 두는 4일 루틴.",
        source: "body",
      };
    case "chest":
      return {
        splits: 6,
        variantId: "ppl-6",
        headline: "6일 루틴 · Push/Pull/Legs ×2",
        reason: "가슴이 상대적으로 약합니다. Push 빈도를 늘리는 PPL.",
        source: "body",
      };
    case "back":
      return {
        splits: 6,
        variantId: "ppl-6",
        headline: "6일 루틴 · Push/Pull/Legs ×2",
        reason: "등이 상대적으로 약합니다. Pull 빈도를 늘리는 PPL.",
        source: "body",
      };
    case "core":
      return {
        splits: 6,
        variantId: "six-part",
        headline: "6일 루틴 · 코어 포함",
        reason: "코어가 상대적으로 약합니다. 코어 데이를 포함한 6일 루틴.",
        source: "body",
      };
  }
}

/** 체성분 없으면 온보딩(성별·경력) 기반 추천으로 fallback */
export function recommendByProfile(
  gender: Gender,
  experience: ExperienceLevel,
): RoutineRecommendation {
  const r = recommendRoutine(gender, experience);
  return { ...r, source: "profile" };
}
