import { describe, expect, it } from "vitest";

import { computeWeightDelta } from "@/features/profile/weight-delta";

describe("computeWeightDelta — 직전 대비 체중 증감", () => {
  it("기록 없으면 null", () => {
    expect(computeWeightDelta([])).toBeNull();
    expect(computeWeightDelta([null, null])).toBeNull();
    expect(computeWeightDelta([0, null])).toBeNull();
  });

  it("기록 1개면 최신만, 증감 null", () => {
    expect(computeWeightDelta([72.5])).toEqual({
      latestKg: 72.5,
      prevKg: null,
      deltaKg: null,
    });
  });

  it("감량은 음수 증감", () => {
    expect(computeWeightDelta([74, 72.5])).toEqual({
      latestKg: 72.5,
      prevKg: 74,
      deltaKg: -1.5,
    });
  });

  it("증가는 양수 증감, 소수1자리 반올림", () => {
    const d = computeWeightDelta([70, 70.34]);
    expect(d?.latestKg).toBe(70.34);
    expect(d?.deltaKg).toBe(0.3);
  });

  it("null/0 은 건너뛰고 유효 기록 2개로 계산", () => {
    expect(computeWeightDelta([80, null, 0, 79.2])).toEqual({
      latestKg: 79.2,
      prevKg: 80,
      deltaKg: -0.8,
    });
  });
});
