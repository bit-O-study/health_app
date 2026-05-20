/**
 * 칼로리(kcal) 추정 — 체중 × MET × 시간 기반의 단순 근사값.
 *   kcal/min = (MET × 3.5 × kg) / 200
 * 정확한 측정값이 아닌 가이드용 수치.
 */

import { loadClassOf, type LoadClass } from "@/features/routine/exercise-catalog";

const STRENGTH_MET: Record<LoadClass, number> = {
  heavy: 6.0,
  medium: 5.0,
  light: 3.5,
  bodyweight: 3.8,
};

/** 컨디셔닝 항목 id → 기본 MET (속도 보정 없을 때) */
const CONDITIONING_MET: Record<string, number> = {
  running: 8.3,
  "stair-master": 9.0,
  cycling: 6.8,
  rowing: 7.0,
  elliptical: 5.0,
  "jump-rope": 11.8,
  walking: 3.5,
};

const STRETCH_MET = 2.3;

function kcalPerMin(met: number, weightKg: number): number {
  return (met * 3.5 * weightKg) / 200;
}

/** 런닝 속도(km/h)에 따른 MET 보정 (compendium 근사) */
function runningMet(speed: number): number {
  if (speed <= 6) return 6.0;
  if (speed <= 8) return 8.3;
  if (speed <= 10) return 10.0;
  if (speed <= 12) return 11.8;
  return 13.5;
}

function metForConditioning(
  itemId: string,
  speed: number | null,
): number {
  if (itemId === "running" && speed && speed > 0) return runningMet(speed);
  return CONDITIONING_MET[itemId] ?? STRETCH_MET;
}

/** 본운동 1세트 추정 시간(분) — 작업 + 휴식 평균 */
const MIN_PER_SET = 1.2;

export function estimateStrengthKcal(
  weightKg: number,
  exerciseId: string,
  sets: number,
): number {
  const loadClass = loadClassOf(exerciseId);
  const met = STRENGTH_MET[loadClass];
  return kcalPerMin(met, weightKg) * sets * MIN_PER_SET;
}

export function estimateConditioningKcal(
  weightKg: number,
  itemId: string,
  durationMin: number | null,
  speed: number | null,
): number {
  // 시간 미지정 모빌리티/스트레칭은 항목당 3분으로 가정
  const min = durationMin ?? 3;
  const met = metForConditioning(itemId, speed);
  return kcalPerMin(met, weightKg) * min;
}

export type CalorieBreakdown = {
  warmup: number;
  main: number;
  cooldown: number;
  total: number;
};

export function estimateTodayKcal(args: {
  weightKg: number | null;
  plan: { exerciseId: string; sets: number }[];
  warmup: { itemId: string; durationMin: number | null; speed: number | null }[];
  cooldown: { itemId: string; durationMin: number | null; speed: number | null }[];
}): CalorieBreakdown {
  const w = args.weightKg ?? 65; // 체형 미입력 시 기본값
  const warmup = args.warmup.reduce(
    (sum, r) => sum + estimateConditioningKcal(w, r.itemId, r.durationMin, r.speed),
    0,
  );
  const main = args.plan.reduce(
    (sum, p) => sum + estimateStrengthKcal(w, p.exerciseId, p.sets),
    0,
  );
  const cooldown = args.cooldown.reduce(
    (sum, r) => sum + estimateConditioningKcal(w, r.itemId, r.durationMin, r.speed),
    0,
  );
  const round = (n: number) => Math.round(n);
  return {
    warmup: round(warmup),
    main: round(main),
    cooldown: round(cooldown),
    total: round(warmup + main + cooldown),
  };
}
