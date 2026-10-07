import { DEFAULT_WEIGHT_KG } from "@/features/routine/default-weight";

/** 1보당 체중 1kg 의 소비 kcal — 캘린더·다짐 예상 등 모든 걸음 계산이 이 값 하나를 쓴다. */
export const STEP_KCAL_PER_KG = 0.00057;

/**
 * 걸음수 → 대략적인 소비 칼로리. 체중 비례(없으면 기본 체중).
 * 1보 ≈ 체중(kg) × 0.00057 kcal (70kg ≈ 0.04 kcal/보, 만 보 ≈ 400kcal 수준).
 */
export function stepsToKcal(
  steps: number,
  weightKg: number | null = null,
): number {
  if (!Number.isFinite(steps) || steps <= 0) return 0;
  const w = weightKg && weightKg > 0 ? weightKg : DEFAULT_WEIGHT_KG;
  return Math.round(steps * w * STEP_KCAL_PER_KG);
}
