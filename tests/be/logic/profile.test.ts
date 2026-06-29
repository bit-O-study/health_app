import { describe, expect, it } from "vitest";

import { bmiOf, bmiCategory } from "@/features/profile/data";

describe("bmiOf — BMI 계산", () => {
  it("키·몸무게로 BMI", () => {
    // 1.75m, 70kg → 70 / 3.0625 ≈ 22.86
    expect(bmiOf(175, 70)).toBeCloseTo(22.86, 1);
  });

  it("값이 없으면 null", () => {
    expect(bmiOf(null, 70)).toBeNull();
    expect(bmiOf(175, null)).toBeNull();
    expect(bmiOf(0, 70)).toBeNull();
    expect(bmiOf(175, 0)).toBeNull();
  });
});

describe("bmiCategory — 아시아 기준 분류", () => {
  it("경계값 분류", () => {
    expect(bmiCategory(17)).toBe("저체중");
    expect(bmiCategory(18.5)).toBe("정상");
    expect(bmiCategory(22.9)).toBe("정상");
    expect(bmiCategory(23)).toBe("과체중");
    expect(bmiCategory(24.9)).toBe("과체중");
    expect(bmiCategory(25)).toBe("비만");
    expect(bmiCategory(30)).toBe("비만");
  });
});
