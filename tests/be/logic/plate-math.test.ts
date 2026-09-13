import { describe, expect, it } from "vitest";

import {
  BAR_KG_OPTIONS,
  PLATE_KG,
  PLATE_KG_WITH_25,
  defaultBarKg,
  formatPerSide,
  isBarKg,
  platesPerSide,
  totalPlateCount,
  usesPlates,
} from "@/features/routine/plate-math";

describe("usesPlates / defaultBarKg", () => {
  it("원판을 꽂는 기구만 true", () => {
    expect(usesPlates("barbell")).toBe(true);
    expect(usesPlates("smith")).toBe(true);
    expect(usesPlates("landmine")).toBe(true);
    for (const eq of ["dumbbell", "machine", "cable", "bodyweight", "band", null, undefined]) {
      expect(usesPlates(eq)).toBe(false);
    }
  });

  it("스미스 기본 봉 무게는 0 — 기계마다 달라서 하나를 찍으면 틀린 값이 된다", () => {
    expect(defaultBarKg("smith")).toBe(0);
    expect(defaultBarKg("barbell")).toBe(20);
    expect(defaultBarKg("landmine")).toBe(20);
  });

  it("isBarKg 는 선택지 안의 값만 통과", () => {
    for (const v of BAR_KG_OPTIONS) expect(isBarKg(v)).toBe(true);
    for (const v of [7, 25, -20, "20", null, undefined, NaN]) expect(isBarKg(v)).toBe(false);
  });
});

describe("platesPerSide", () => {
  it("60kg / 20kg봉 → 한쪽 20", () => {
    expect(platesPerSide(60, 20)).toEqual({ perSide: [20], leftoverKg: 0, belowBar: false });
  });

  it("100kg / 20kg봉 → 한쪽 20+20 (25+15 가 아니라)", () => {
    const r = platesPerSide(100, 20)!;
    expect(r.perSide).toEqual([20, 20]);
    expect(r.leftoverKg).toBe(0);
    expect(totalPlateCount(r.perSide)).toBe(4);
  });

  it("25kg 원판을 넘기면 그때만 25 를 쓴다", () => {
    expect(platesPerSide(100, 20, PLATE_KG_WITH_25)!.perSide).toEqual([25, 15]);
    expect(platesPerSide(70, 20, PLATE_KG_WITH_25)!.perSide).toEqual([25]);
  });

  it("봉만 있는 무게는 원판 0장 (leftover 도 0)", () => {
    expect(platesPerSide(20, 20)).toEqual({ perSide: [], leftoverKg: 0, belowBar: false });
  });

  it("총중량이 봉보다 가벼우면 belowBar", () => {
    const r = platesPerSide(15, 20)!;
    expect(r.belowBar).toBe(true);
    expect(r.perSide).toEqual([]);
  });

  it("2.5 · 1.25 가 섞여도 부동소수 오차가 안 난다", () => {
    // 20 + (1.25 × 2) = 22.5 — 0.1+0.2 류 오차가 나면 leftover 가 0 이 아니게 된다.
    expect(platesPerSide(22.5, 20)).toEqual({ perSide: [1.25], leftoverKg: 0, belowBar: false });
    expect(platesPerSide(25, 20)).toEqual({ perSide: [2.5], leftoverKg: 0, belowBar: false });
    // 61.25kg: 한쪽 20.625 → 20 끼우고 0.625 남음(양쪽 1.25)
    const r = platesPerSide(61.25, 20)!;
    expect(r.perSide).toEqual([20]);
    expect(r.leftoverKg).toBeCloseTo(1.25, 5);
  });

  it("원판으로 못 맞추면 남은 무게를 leftover 로 돌려준다", () => {
    // 61kg / 20봉 → 한쪽 20.5 → 20 끼우고 0.5 남음(양쪽 1kg)
    const r = platesPerSide(61, 20)!;
    expect(r.perSide).toEqual([20]);
    expect(r.leftoverKg).toBeCloseTo(1, 5);
  });

  it("봉 0(스미스) 이면 총중량을 그대로 반으로 나눈다", () => {
    expect(platesPerSide(40, 0)!.perSide).toEqual([20]);
  });

  it("무게가 없거나 0 이하면 null", () => {
    expect(platesPerSide(null, 20)).toBeNull();
    expect(platesPerSide(0, 20)).toBeNull();
    expect(platesPerSide(-10, 20)).toBeNull();
    expect(platesPerSide(Number.NaN, 20)).toBeNull();
  });

  it("모든 표준 원판이 실제로 쓰인다 — 한 장씩 끼운 무게를 되돌려 준다", () => {
    for (const p of PLATE_KG) {
      const total = 20 + p * 2;
      expect(platesPerSide(total, 20)!.perSide).toEqual([p]);
    }
  });

  it("합계가 항상 총중량과 맞는다(무작위 표본)", () => {
    for (let total = 20; total <= 300; total += 1.25) {
      const r = platesPerSide(total, 20)!;
      const sum = 20 + r.perSide.reduce((a, b) => a + b, 0) * 2 + r.leftoverKg;
      expect(sum).toBeCloseTo(total, 5);
    }
  });
});

describe("formatPerSide", () => {
  it("같은 원판은 ×n 으로 묶는다", () => {
    expect(formatPerSide([20, 20, 5])).toBe("20×2 + 5");
    expect(formatPerSide([25, 20, 1.25])).toBe("25 + 20 + 1.25");
    expect(formatPerSide([2.5])).toBe("2.5");
  });

  it("빈 구성은 '없음'", () => {
    expect(formatPerSide([])).toBe("없음");
  });
});
