import { describe, expect, it } from "vitest";

import {
  WATER_CUPS,
  WATER_MAX_ML,
  clampWaterMl,
  dailyWaterTargetMl,
  formatWater,
  waterPercent,
} from "@/features/diet/water";

describe("dailyWaterTargetMl", () => {
  it("체중 × 33ml, 100ml 단위", () => {
    expect(dailyWaterTargetMl(70)).toBe(2300); // 2310 → 2300
    expect(dailyWaterTargetMl(60)).toBe(2000); // 1980 → 2000
    expect(dailyWaterTargetMl(85)).toBe(2800); // 2805 → 2800
  });

  it("아주 가볍거나 무거워도 1.5~4L 안으로 자른다", () => {
    expect(dailyWaterTargetMl(30)).toBe(1500);
    expect(dailyWaterTargetMl(200)).toBe(4000);
  });

  it("체중을 모르면 성인 일반 권장 2L", () => {
    for (const v of [null, undefined, 0, -5, Number.NaN]) {
      expect(dailyWaterTargetMl(v as number | null)).toBe(2000);
    }
  });
});

describe("clampWaterMl", () => {
  it("음수는 0 — '되돌리기'를 연타해도 마이너스가 저장되지 않는다", () => {
    expect(clampWaterMl(-200)).toBe(0);
  });

  it("하루 최대를 넘지 않는다", () => {
    expect(clampWaterMl(99999)).toBe(WATER_MAX_ML);
  });

  it("소수는 반올림, 이상한 값은 0", () => {
    expect(clampWaterMl(200.4)).toBe(200);
    expect(clampWaterMl(200.6)).toBe(201);
    expect(clampWaterMl(Number.NaN)).toBe(0);
  });
});

describe("waterPercent", () => {
  it("목표 대비 비율", () => {
    expect(waterPercent(1000, 2000)).toBe(50);
    expect(waterPercent(2000, 2000)).toBe(100);
  });

  it("넘겨도 그대로 돌려준다(자르는 건 화면 몫)", () => {
    expect(waterPercent(3000, 2000)).toBe(150);
  });

  it("목표가 0이면 0 — 0으로 나누지 않는다", () => {
    expect(waterPercent(500, 0)).toBe(0);
  });
});

describe("formatWater", () => {
  it("1L 미만은 ml, 이상은 L 소수 한 자리", () => {
    expect(formatWater(0)).toBe("0ml");
    expect(formatWater(800)).toBe("800ml");
    expect(formatWater(1000)).toBe("1L");
    expect(formatWater(1250)).toBe("1.3L");
    expect(formatWater(2300)).toBe("2.3L");
  });
});

describe("WATER_CUPS", () => {
  it("작은 것부터, 전부 양수", () => {
    const mls = WATER_CUPS.map((c) => c.ml);
    expect(mls).toEqual([...mls].sort((a, b) => a - b));
    expect(mls.every((m) => m > 0)).toBe(true);
  });
});
