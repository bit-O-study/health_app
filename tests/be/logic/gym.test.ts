import { describe, expect, it } from "vitest";

import {
  COINS_PER_WORKOUT,
  coinsForLevel,
  gymLevel,
  wolfScale,
} from "@/features/groups/gym";

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

describe("coinsForLevel", () => {
  it("gets pricier per level", () => {
    expect(coinsForLevel(0)).toBe(50);
    expect(coinsForLevel(1)).toBe(80);
    expect(coinsForLevel(2)).toBe(110);
    expect(coinsForLevel(1)).toBeGreaterThan(coinsForLevel(0));
  });
  it("guards negatives", () => {
    expect(coinsForLevel(-3)).toBe(50);
  });
  it("coins per workout constant", () => {
    expect(COINS_PER_WORKOUT).toBeGreaterThan(0);
  });
});
