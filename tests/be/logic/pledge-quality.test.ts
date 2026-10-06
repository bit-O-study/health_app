import { describe, expect, it } from "vitest";

import { averageWeight, dataQuality, type QualityInput } from "@/features/commitments/quality";

const good: QualityInput = {
  days: 30,
  mealsPerDay: 3,
  mealDaysMet: 30,
  loggedMeals: 90,
  photoMeals: 45,
  skippedMeals: 0,
  avgIntakeKcal: 1700,
  bmr: 1580,
  startWeightPoints: 4,
  endWeightPoints: 5,
  inbodyStart: "2026-10-01",
  inbodyEnd: "2026-10-31",
};

describe("다짐 결과 신뢰도", () => {
  it("7일 평균 체중 — 하루 수분 변동을 줄인다", () => {
    expect(averageWeight([70.4, 69.2, 70.0, 69.6])).toBe(69.8);
    expect(averageWeight([])).toBeNull();
  });

  it("꼼꼼히 기록하면 체중 학습에 쓰지만, 30일 인바디 근육은 오차보다 작아 안 쓴다", () => {
    const q = dataQuality(good);
    expect(q.score).toBeGreaterThanOrEqual(80);
    expect(q.usableForWeight).toBe(true);
    expect(q.usableForMuscle).toBe(false);
    expect(q.flags.join()).toContain("60일 이상");
  });

  it("60일 이상 떨어진 인바디가 있으면 근육도 쓴다", () => {
    expect(dataQuality({ ...good, days: 60, mealDaysMet: 60, inbodyEnd: "2026-12-01" }).usableForMuscle).toBe(true);
  });

  it("기초대사보다 적게 기록됐으면 덜 적은 기록 의심 — 점수가 떨어진다", () => {
    const q = dataQuality({ ...good, avgIntakeKcal: 1100 });
    expect(q.underreportSuspected).toBe(true);
    expect(q.intakeVsBmr).toBeCloseTo(0.7, 2);
    expect(q.score).toBeLessThan(dataQuality(good).score);
  });

  it("끝 7일 체중 기록이 한 번뿐이면 체중 실측을 믿지 않는다", () => {
    const q = dataQuality({ ...good, endWeightPoints: 1 });
    expect(q.weightReliable).toBe(false);
    expect(q.usableForWeight).toBe(false);
  });

  it("끼니가 많이 빠지면 학습 기준(60점) 아래", () => {
    const q = dataQuality({ ...good, mealDaysMet: 9, loggedMeals: 27, photoMeals: 0, avgIntakeKcal: 900 });
    expect(q.score).toBeLessThan(60);
    expect(q.usableForWeight).toBe(false);
    expect(q.flags.join()).toContain("끼니 기록");
  });
});
