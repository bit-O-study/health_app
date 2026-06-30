import { describe, expect, it } from "vitest";

import { stepsToKcal } from "@/features/health/steps-calories";

describe("stepsToKcal — 걸음수 → 소비 칼로리", () => {
  it("0/음수/NaN 은 0", () => {
    expect(stepsToKcal(0)).toBe(0);
    expect(stepsToKcal(-100, 70)).toBe(0);
    expect(stepsToKcal(Number.NaN, 70)).toBe(0);
  });

  it("체중 비례(70kg, 만 보 ≈ 400kcal 수준)", () => {
    // 10000 * 70 * 0.00057 = 399
    expect(stepsToKcal(10000, 70)).toBe(399);
  });

  it("체중 없으면 65kg 가정", () => {
    // 10000 * 65 * 0.00057 = 370.5 → 371
    expect(stepsToKcal(10000)).toBe(371);
    expect(stepsToKcal(10000, null)).toBe(371);
  });

  it("걸음 많을수록 칼로리 큼", () => {
    expect(stepsToKcal(5000, 70)).toBeLessThan(stepsToKcal(15000, 70));
  });
});
