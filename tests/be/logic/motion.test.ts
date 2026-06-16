import { describe, expect, it } from "vitest";

import {
  accelMagnitude,
  runIntensityFromAccel,
} from "@/features/running/motion";

describe("motion (카메라 없이 달리기 감지)", () => {
  it("가속도 크기는 3축 유클리드 길이", () => {
    expect(accelMagnitude(0, 9.8, 0)).toBeCloseTo(9.8);
    expect(accelMagnitude(3, 4, 0)).toBeCloseTo(5);
  });

  it("가만히 있으면 0, 크게 흔들리면(달리기) 강도↑", () => {
    const still = Array.from({ length: 24 }, () => 9.8);
    expect(runIntensityFromAccel(still)).toBe(0);

    // 표본 부족도 0
    expect(runIntensityFromAccel([9.8, 9.8])).toBe(0);

    // 큰 진폭의 주기적 흔들림 = 달리기 → 높은 강도
    const running = Array.from({ length: 24 }, (_, i) =>
      9.8 + (i % 2 ? 8 : -8),
    );
    expect(runIntensityFromAccel(running)).toBeGreaterThan(0.7);

    // 약한 흔들림(걷기)은 중간 이하
    const walking = Array.from({ length: 24 }, (_, i) =>
      9.8 + (i % 2 ? 1.5 : -1.5),
    );
    const w = runIntensityFromAccel(walking);
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThan(0.5);
  });
});
