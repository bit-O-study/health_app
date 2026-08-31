/**
 * 칼로리(kcal) 추정 — 체중 × MET × 시간 기반의 단순 근사값.
 * kcal/min = (MET × 3.5 × kg) / 200
 * 정확한 측정값이 아닌 가이드용 수치.
 */

// ⚠ 강도 등급만 필요하다 — exercise-catalog 를 쓰면 운동 목록 274 KiB 가 딸려온다.
import { loadClassOf, type LoadClass } from "@/features/routine/exercise-load";

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

/** 경사도(%) 보정 — 트레드밀 오르막은 소모가 커진다(근사: 1%당 약 +3%). */
function inclineFactor(incline: number | null): number {
  if (!incline || incline <= 0) return 1;
  return 1 + Math.min(15, incline) * 0.03;
}

function metForConditioning(
  itemId: string,
  speed: number | null,
  incline: number | null = null,
): number {
  if (itemId === "running" && speed && speed > 0) {
    return runningMet(speed) * inclineFactor(incline);
  }
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
  incline: number | null = null,
): number {
  // 시간 미지정 모빌리티/스트레칭은 항목당 3분으로 가정
  const min = durationMin ?? 3;
  const met = metForConditioning(itemId, speed, incline);
  return kcalPerMin(met, weightKg) * min;
}

/**
 * '완료한 근력운동 1건'의 kcal — 오늘의 운동·캘린더·기록·그룹 모든 화면이 이 함수 하나만
 * 써서 값이 항상 같게 한다. `sets` 는 반드시 **완료 스냅샷의 실제 세트수**를 넘긴다(계획
 * 기본값 X). 예전엔 화면마다 세트 소스가 달라 칼로리가 어긋났다 — 단일 진입점으로 재발 방지.
 */
export function strengthKcalForCompletion(
  weightKg: number,
  exerciseId: string,
  snapshotSets: number,
): number {
  return estimateStrengthKcal(weightKg, exerciseId, snapshotSets);
}

/** 홈 대시보드 "얼마나 더 운동해야 하나" 안내용 — 보통 강도 유산소 기준(가이드용). */
const GENERAL_MET = 6.0;

/** kcal 을 태우는 데 필요한 대략적인 운동 시간(분) — 보통 강도 유산소 가정. */
export function kcalToMinutes(kcal: number, weightKg: number | null): number {
  if (kcal <= 0) return 0;
  const perMin = kcalPerMin(GENERAL_MET, weightKg ?? 65);
  return perMin > 0 ? Math.round(kcal / perMin) : 0;
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
  warmup: {
    itemId: string;
    durationMin: number | null;
    speed: number | null;
  }[];
  cooldown: {
    itemId: string;
    durationMin: number | null;
    speed: number | null;
  }[];
}): CalorieBreakdown {
  const w = args.weightKg ?? 65; // 체형 미입력 시 기본값
  const warmup = args.warmup.reduce(
    (sum, r) =>
      sum + estimateConditioningKcal(w, r.itemId, r.durationMin, r.speed),
    0,
  );
  const main = args.plan.reduce(
    (sum, p) => sum + estimateStrengthKcal(w, p.exerciseId, p.sets),
    0,
  );
  const cooldown = args.cooldown.reduce(
    (sum, r) =>
      sum + estimateConditioningKcal(w, r.itemId, r.durationMin, r.speed),
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
