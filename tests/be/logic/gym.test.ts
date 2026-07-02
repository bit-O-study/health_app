import { describe, expect, it } from "vitest";

import { gymLevel, wolfScale } from "@/features/groups/gym";

describe("gymLevel", () => {
  it("starts at Lv0", () => {
    expect(gymLevel(0)).toBe(0);
    expect(gymLevel(2)).toBe(0);
  });
  it("levels on thresholds 3,5,7…", () => {
    expect(gymLevel(3)).toBe(1);
    expect(gymLevel(8)).toBe(2); // 3+5
    expect(gymLevel(15)).toBe(3); // 3+5+7
  });
  it("guards junk", () => {
    expect(gymLevel(-4)).toBe(0);
    expect(gymLevel(NaN)).toBe(0);
  });
});

describe("wolfScale", () => {
  it("grows with level, capped", () => {
    expect(wolfScale(0)).toBeCloseTo(0.8);
    expect(wolfScale(5)).toBeGreaterThan(wolfScale(0));
    expect(wolfScale(100)).toBeLessThanOrEqual(1.7);
  });
});
