/**
 * 걸음수 → 대략적인 소비 칼로리. 체중 비례(없으면 65kg 가정).
 * 1보 ≈ 체중(kg) × 0.00057 kcal (70kg ≈ 0.04 kcal/보, 만 보 ≈ 400kcal 수준).
 */
export function stepsToKcal(
  steps: number,
  weightKg: number | null = null,
): number {
  if (!Number.isFinite(steps) || steps <= 0) return 0;
  const w = weightKg && weightKg > 0 ? weightKg : 65;
  return Math.round(steps * w * 0.00057);
}
