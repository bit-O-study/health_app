import { describe, expect, it } from "vitest";

import {
  COINS_PER_WORKOUT,
  applyDeposit,
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

describe("applyDeposit", () => {
  it("deposits into progress without leveling", () => {
    // Lv0 비용 50. 30 넣으면 progress 30, 레벨 그대로.
    const r = applyDeposit(0, 100, 0, 30);
    expect(r).toMatchObject({ level: 0, coins: 70, progress: 30, added: 30 });
  });
  it("auto levels up when filled + carries overflow", () => {
    // Lv0 비용 50. progress 40 + 20 = 60 → Lv1, 이월 10.
    const r = applyDeposit(0, 100, 40, 20);
    expect(r.level).toBe(1);
    expect(r.progress).toBe(10);
    expect(r.coins).toBe(80);
  });
  it("can level multiple times with a big deposit", () => {
    // Lv0(50)+Lv1(80)=130. 130 한 번에 → Lv2, progress 0.
    const r = applyDeposit(0, 200, 0, 130);
    expect(r.level).toBe(2);
    expect(r.progress).toBe(0);
  });
  it("clamps to available coins", () => {
    const r = applyDeposit(0, 20, 0, 999);
    expect(r.added).toBe(20);
    expect(r.coins).toBe(0);
  });
  it("no-op on zero/negative or no coins", () => {
    expect(applyDeposit(1, 100, 5, 0).added).toBe(0);
    expect(applyDeposit(1, 0, 5, 50).added).toBe(0);
  });
});
