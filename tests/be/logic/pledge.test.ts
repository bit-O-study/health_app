import { describe, expect, it } from "vitest";

import {
  sanitizePledge,
  validatePledge,
  pledgeLines,
  type PledgeSpec,
} from "@/features/commitments/pledge";
import {
  estimateBodyFatPct,
  predictPledge,
  proteinFactor,
  energyFactor,
  planForGoal,
  partShare,
  segmentForecast,
  missingBodyFields,
  observedMetabolicFactor,
  calibrationFrom,
  ffmiFactor,
  type BodyInput,
} from "@/features/commitments/prediction";
import {
  EMPTY_PLEDGE_DAY,
  evaluatePledge,
  pledgeBlocks,
  scaledPerWeek,
  shortDates,
  failReasons,
  type PledgeDay,
} from "@/features/commitments/evaluation";

const man: BodyInput = {
  gender: "male",
  age: 30,
  heightCm: 175,
  weightKg: 70,
  bodyFatPct: null,
  experience: "beginner",
};
const body = { weightKg: 70, gender: "male" as const };
const label = (p: string) => p;

describe("pledge — 정리·검증", () => {
  it("범위를 벗어난 값은 버리고 기간이 없으면 null", () => {
    expect(sanitizePledge({ workoutDays: 4 })).toBeNull();
    const p = sanitizePledge({ days: 30, workoutDays: 9, burnKcal: 500, mealsPerDay: 5, strength: [{ part: "back", perWeek: 2 }, { part: "back", perWeek: 3 }, { part: "x", perWeek: 1 }] })!;
    expect(p.days).toBe(30);
    expect(p.workoutDays).toBeUndefined();
    expect(p.mealsPerDay).toBeUndefined();
    expect(p.strength).toEqual([{ part: "back", perWeek: 2 }]);
  });

  it("소모 kcal 다짐은 식단 kcal 다짐 없이 저장할 수 없다", () => {
    const r = validatePledge({ days: 30, workoutDays: 4, burnKcal: 500 }, body);
    expect(r.errors.join()).toContain("식단 칼로리");
  });

  it("근력 다짐은 단백질 다짐(체중 × 1.2g 이상) 없이 저장할 수 없다", () => {
    expect(validatePledge({ days: 30, strength: [{ part: "back", perWeek: 2 }] }, body).errors.join()).toContain("단백질");
    expect(
      validatePledge({ days: 30, strength: [{ part: "back", perWeek: 2 }], proteinG: 80, mealsPerDay: 3 }, body).errors.join(),
    ).toContain("84g");
    expect(
      validatePledge({ days: 30, strength: [{ part: "back", perWeek: 2 }], proteinG: 84, mealsPerDay: 3 }, body).errors,
    ).toEqual([]);
  });

  it("식단 다짐은 하루 끼니 수가 있어야 한다", () => {
    expect(validatePledge({ days: 30, intakeMax: 1800 }, body).errors.join()).toContain("몇 끼");
  });

  it("'주 N일 운동하기'만 있는 다짐도 만들 수 있다", () => {
    expect(validatePledge({ days: 30, workoutDays: 4 }, body).errors).toEqual([]);
  });

  it("너무 낮은 섭취 상한은 경고만 한다(막지 않음)", () => {
    const r = validatePledge({ days: 30, workoutDays: 4, burnKcal: 1000, intakeMax: 700, mealsPerDay: 2 }, body);
    expect(r.errors).toEqual([]);
    expect(r.warnings.join()).toContain("1,500kcal");
  });

  it("항목 문구", () => {
    expect(
      pledgeLines({ days: 30, workoutDays: 4, burnKcal: 500, intakeMax: 1680, mealsPerDay: 3 }, label),
    ).toEqual(["주 4일 · 하루 500kcal 이상 소모", "하루 3끼 식단 기록", "하루 1,680kcal 이하 먹기"]);
  });
});

describe("prediction — rule-v3", () => {
  it("체지방률을 모르면 Deurenberg 로 추정한다(70kg·175cm·30세 남 ≈ 18%)", () => {
    expect(estimateBodyFatPct(man)).toBeCloseTo(18.1, 0);
    expect(estimateBodyFatPct({ ...man, bodyFatPct: 25 })).toBe(25);
  });

  it("단백질 계수는 1.6g/kg 에서 1, 1.2g/kg 에서 0.7", () => {
    expect(proteinFactor(1.6)).toBe(1);
    expect(proteinFactor(1.2)).toBeCloseTo(0.7);
  });

  it("칼로리 계수 — 적자가 클수록 작고, 입문자는 리컴포지션 가산", () => {
    expect(energyFactor(300, "beginner")).toBe(1);
    expect(energyFactor(-375, "intermediate")).toBeCloseTo(0.525);
    expect(energyFactor(-375, "beginner")).toBeCloseTo(0.675);
    expect(energyFactor(-2000, "beginner")).toBe(0);
  });

  it("식단 kcal 다짐이 없으면 체중 예상을 내지 않는다", () => {
    const r = predictPledge({ days: 30, workoutDays: 4 }, man);
    expect(r.weightKg).toBeNull();
    expect(r.muscleKg).toBeNull();
    expect(r.hints.join()).toContain("식단 칼로리");
  });

  it("소모 + 식단만 — 감량하지만 근손실도 같이 난다(Forbes)", () => {
    const r = predictPledge({ days: 30, workoutDays: 4, burnKcal: 500, intakeMax: 1680, mealsPerDay: 3 }, man);
    expect(r.weightKg).toBeCloseTo(-3.3, 1);
    expect(r.waterKg).toBeCloseTo(-1.1, 1); // 첫 주 글리코겐 + 수분
    expect(r.fatKg!).toBeLessThan(0);
    expect(r.leanKg!).toBeLessThan(0);
    expect(r.muscleKg).toBeNull();
  });

  it("근력 + 단백질을 넣으면 체중은 덜 빠지지만 지방은 더 빠지고 근육은 는다", () => {
    const base: PledgeSpec = { days: 30, workoutDays: 4, burnKcal: 500, intakeMax: 1680, mealsPerDay: 3 };
    const a = predictPledge(base, man);
    const b = predictPledge({ ...base, strength: [{ part: "any", perWeek: 2 }], proteinG: 112 }, man);
    expect(b.weightKg!).toBeGreaterThan(a.weightKg!);
    expect(b.fatKg!).toBeLessThan(a.fatKg!);
    expect(b.leanKg!).toBeGreaterThan(0);
    expect(b.muscleKg!).toBeCloseTo(0.2, 1);
    expect(b.weightRange![0]).toBeLessThan(b.weightRange![1]);
  });

  it("근력 + 단백질만(식단 kcal 없음) — 근육만 예상한다", () => {
    const r = predictPledge({ days: 30, strength: [{ part: "back", perWeek: 2 }], proteinG: 112, mealsPerDay: 3 }, man);
    expect(r.weightKg).toBeNull();
    expect(r.muscleKg!).toBeGreaterThan(0);
    expect(r.parts).toEqual(["back"]);
  });

  it("부위만 고르면 부위 비중만큼만", () => {
    expect(partShare({ days: 30, strength: [{ part: "back", perWeek: 2 }] })).toBeCloseTo(0.2);
    expect(partShare({ days: 30, strength: [{ part: "any", perWeek: 2 }, { part: "back", perWeek: 2 }] })).toBe(1);
  });

  it("체중이 빠질수록 덜 빠진다(7,700 단순식보다 장기 감량이 작다)", () => {
    const p: PledgeSpec = { days: 180, workoutDays: 5, burnKcal: 550, intakeMax: 1700, mealsPerDay: 3 };
    const r = predictPledge(p, { ...man, weightKg: 80 });
    const first30 = predictPledge({ ...p, days: 30 }, { ...man, weightKg: 80 }).weightKg!;
    expect(r.weightKg! / 6).toBeGreaterThan(first30); // 음수 — 평균 월 감량이 첫 달보다 작다
  });
});

describe("planForGoal — 990원 역산", () => {
  it("20kg 감량 → 소모·식단·근력·단백질 다짐과 단계 수", () => {
    const big = { ...man, weightKg: 110 };
    const plan = planForGoal({ type: "lose_weight", kg: 20 }, big);
    expect(plan.error).toBeUndefined();
    expect(plan.pledge.days).toBe(30);
    expect(plan.pledge.intakeMax).toBeGreaterThanOrEqual(1500);
    expect(plan.pledge.burnKcal).toBeGreaterThan(0);
    expect(plan.pledge.strength).toEqual([{ part: "any", perWeek: 2 }]);
    expect(plan.pledge.proteinG).toBe(175);
    expect(plan.totalDays).toBeGreaterThan(150);
    expect(plan.stages).toBe(Math.ceil(plan.totalDays! / 30));
    expect(validatePledge(plan.pledge, { weightKg: 110, gender: "male" }).errors).toEqual([]);
  });

  it("무리한 목표는 거절", () => {
    expect(planForGoal({ type: "lose_weight", kg: 40 }, man).error).toBeTruthy();
    // 80kg·추정 체지방 22% — 근육을 지키며 20kg 은 불가능(체지방이 그만큼 없다).
    expect(planForGoal({ type: "lose_weight", kg: 20 }, { ...man, weightKg: 80 }).error).toContain("최대 약");
  });

  it("근육 3kg → 근력 주 4회 + 단백질 + 섭취 하한", () => {
    const plan = planForGoal({ type: "gain_muscle", kg: 3 }, man);
    expect(plan.pledge.strength).toEqual([{ part: "any", perWeek: 4 }]);
    expect(plan.pledge.intakeMin).toBeGreaterThan(2000);
    expect(plan.totalDays).toBeGreaterThan(30);
    expect(validatePledge(plan.pledge, body).errors).toEqual([]);
  });

  it("부위 키우기 → 그 부위 주 2회", () => {
    const plan = planForGoal({ type: "grow_part", part: "back" }, man);
    expect(plan.pledge.strength?.[0]).toEqual({ part: "back", perWeek: 2 });
  });
});

describe("evaluation — 7일 구간 판정", () => {
  const start = "2026-10-06";
  const pledge: PledgeSpec = { days: 30, workoutDays: 4, burnKcal: 500, intakeMax: 1800, mealsPerDay: 3 };
  const good: PledgeDay = { ...EMPTY_PLEDGE_DAY, burnKcal: 600, workedOut: true, intakeKcal: 1700, mealCount: 3 };
  const rest: PledgeDay = { ...EMPTY_PLEDGE_DAY, intakeKcal: 1700, mealCount: 3 };
  /** 월·화·목·토 운동 같은 패턴 — 7일 중 4일 운동. */
  const pattern = (d: string) => (["0", "1", "3", "5"].includes(String((Date.parse(d) / 86400000) % 7)) ? good : rest);

  it("30일 = 7 × 4 + 2일 구간, 마지막 구간 목표는 비례(올림)", () => {
    const b = pledgeBlocks(start, 30);
    expect(b).toHaveLength(5);
    expect(b[4]).toMatchObject({ start: "2026-11-03", end: "2026-11-04", days: 2 });
    expect(scaledPerWeek(4, 2)).toBe(2);
    expect(scaledPerWeek(4, 7)).toBe(4);
  });

  it("구간 안에서는 진행 중, 구간이 끝난 다음날 판정", () => {
    const allGood = () => good;
    expect(evaluatePledge(pledge, start, allGood, "2026-10-10").status).toBe("active");
    const r = evaluatePledge(pledge, start, allGood, "2026-10-13");
    expect(r.blocks[0].closed).toBe(true);
    expect(r.current?.index).toBe(1);
  });

  it("하루라도 끼니 수가 모자라면 그 구간 끝에 실패, 그 전엔 채울 수 있다", () => {
    const missing = (d: string) => (d === "2026-10-08" ? { ...good, mealCount: 2 } : good);
    const mid = evaluatePledge(pledge, start, missing, "2026-10-10");
    expect(mid.status).toBe("active");
    expect(mid.current?.missingDietDates).toEqual(["2026-10-08"]);
    expect(shortDates(mid.current!.missingDietDates)).toBe("10/8");
    const after = evaluatePledge(pledge, start, missing, "2026-10-13");
    expect(after.status).toBe("failed");
    expect(failReasons(after.failedBlock!)).toEqual(["diet_missing"]);
    expect(after.decidedOn).toBe("2026-10-13");
  });

  it("오늘은 아직 진행 중이라 미기록 날로 세지 않는다", () => {
    const r = evaluatePledge(pledge, start, (d) => (d === "2026-10-07" ? EMPTY_PLEDGE_DAY : good), "2026-10-07");
    expect(r.current?.missingDietDates).toEqual([]);
  });

  it("운동일이 목표보다 하루라도 모자라면 실패", () => {
    const three = (d: string) => (d <= "2026-10-08" ? good : rest);
    const r = evaluatePledge(pledge, start, three, "2026-10-13");
    expect(r.status).toBe("failed");
    expect(failReasons(r.failedBlock!)).toEqual(["workout_short"]);
  });

  it("평균 섭취가 상한을 넘으면 실패(하루 초과는 평균으로 흡수)", () => {
    const oneBig = (d: string) => (d === "2026-10-07" ? { ...good, intakeKcal: 2300 } : good);
    expect(evaluatePledge(pledge, start, oneBig, "2026-10-13").status).toBe("active");
    const allBig = () => ({ ...good, intakeKcal: 2000 });
    expect(failReasons(evaluatePledge(pledge, start, allBig, "2026-10-13").failedBlock!)).toEqual(["intake_over"]);
  });

  it("모든 구간을 통과하면 종료 다음날 성공", () => {
    const r = evaluatePledge(pledge, start, () => good, "2026-11-05");
    expect(r.status).toBe("success");
    expect(r.decidedOn).toBe("2026-11-05");
    expect(evaluatePledge(pledge, start, pattern, "2026-10-05").status).toBe("upcoming");
  });

  it("부위별 근력 — 그 부위를 운동한 날만 센다", () => {
    const p: PledgeSpec = { days: 7, strength: [{ part: "back", perWeek: 2 }], proteinG: 100, mealsPerDay: 1 };
    const backOnce = (d: string) => ({
      ...EMPTY_PLEDGE_DAY,
      mealCount: 1,
      proteinG: 110,
      strength: true,
      strengthParts: d === "2026-10-06" ? (["back"] as const).slice() : (["chest"] as const).slice(),
    });
    const r = evaluatePledge(p, start, backOnce, "2026-10-13");
    expect(r.status).toBe("failed");
    expect(failReasons(r.failedBlock!)).toEqual(["strength_short"]);
  });
});

describe("prediction — InBody·개인 보정", () => {
  const inbody = {
    measuredAt: "2026-10-01",
    weightKg: 70,
    bodyFatKg: 14,
    bodyFatPct: 20,
    skeletalMuscleKg: 31.5,
    armsKg: 6.4,
    trunkKg: 25.1,
    legsKg: 18.9,
  };
  const withIb: BodyInput = { ...man, inbody };

  it("InBody 체지방량으로 제지방을 실측하고 Katch-McArdle 로 BMR 을 낸다", () => {
    const r = predictPledge({ days: 30, workoutDays: 4, burnKcal: 500, intakeMax: 1680, mealsPerDay: 3 }, withIb);
    expect(r.baseline.bodyFatPct).toBe(20);
    expect(r.baseline.bodyFatMeasured).toBe(true);
    expect(r.baseline.bmr).toBe(Math.round(370 + 21.6 * 56));
    expect(r.baseline.skeletalMuscleKg).toBe(31.5);
    expect(r.baseline.smmShare).toBeCloseTo(0.56, 2); // 31.5 / 56
  });

  it("측정 뒤 체중이 늘었으면 제지방은 그대로, 차이는 지방으로 본다", () => {
    expect(estimateBodyFatPct({ ...withIb, weightKg: 72 })).toBeCloseTo((16 / 72) * 100, 1);
  });

  it("부위별 예상 — 등 운동은 몸통에, 전신은 지금 부위 비율대로", () => {
    const back = predictPledge({ days: 30, strength: [{ part: "back", perWeek: 2 }], proteinG: 112, mealsPerDay: 3 }, withIb);
    expect(back.segments.map((s) => s.segment)).toEqual(["trunk"]);
    expect(back.segments[0].nowKg).toBe(25.1);
    expect(back.segments[0].gainKg).toBeCloseTo(back.muscleKg!, 2);
    const all = segmentForecast(withIb, { days: 30, strength: [{ part: "any", perWeek: 3 }] }, 1);
    expect(all.find((s) => s.segment === "legs")!.gainKg).toBeCloseTo(18.9 / (6.4 + 25.1 + 18.9), 1);
  });

  it("다짐에 필요한 몸 정보 — InBody 없으면 체지방·골격근이 빠진다", () => {
    expect(missingBodyFields({ heightCm: 175, weightKg: 70, inbody: null })).toEqual(["bodyFat", "skeletalMuscle"]);
    expect(missingBodyFields({ heightCm: null, weightKg: null, inbody: null })).toEqual(["height", "weight", "bodyFat", "skeletalMuscle"]);
    expect(missingBodyFields({ heightCm: 175, weightKg: 70, inbody })).toEqual([]);
  });

  it("개인 대사 보정 — 기록상 덜 먹는데도 안 빠지면 대사가 낮게(0.8~1.2)", () => {
    const k = observedMetabolicFactor({ body: withIb, avgIntakeKcal: 1700, loggedDays: 21, weightChangeKg: 0, spanDays: 21, avgExerciseKcal: 100 });
    expect(k).not.toBeNull();
    expect(k!).toBeLessThan(1);
    expect(observedMetabolicFactor({ body: withIb, avgIntakeKcal: 1700, loggedDays: 5, weightChangeKg: 0, spanDays: 21, avgExerciseKcal: 0 })).toBeNull();
    const slow = predictPledge({ days: 30, workoutDays: 4, burnKcal: 500, intakeMax: 1680, mealsPerDay: 3 }, { ...withIb, metabolicFactor: 0.9 });
    const norm = predictPledge({ days: 30, workoutDays: 4, burnKcal: 500, intakeMax: 1680, mealsPerDay: 3 }, withIb);
    expect(slow.weightKg!).toBeGreaterThan(norm.weightKg!); // 덜 빠진다
  });

  it("지난 다짐 실측 ÷ 예측으로 보정(중앙값, 0.5~1.5)", () => {
    const c = calibrationFrom([
      { kind: "weight", predicted: -2, actual: -1.6 },
      { kind: "weight", predicted: -3, actual: -2.4 },
      { kind: "weight", predicted: -0.1, actual: -1 }, // 예측이 너무 작아 제외
      { kind: "muscle", predicted: 0.4, actual: null },
    ]);
    expect(c.weight).toBeCloseTo(0.8);
    expect(c.muscle).toBeNull();
    const p: PledgeSpec = { days: 30, workoutDays: 4, burnKcal: 500, intakeMax: 1680, mealsPerDay: 3 };
    const r = predictPledge(p, man, { calibration: c });
    expect(r.calibrated).toBe(true);
    expect(r.weightKg!).toBeCloseTo(predictPledge(p, man).weightKg! * 0.8, 0);
  });

  it("적자가 너무 크면 근력운동을 해도 근육이 빠진다(보호된 손실)", () => {
    const r = predictPledge(
      { days: 30, workoutDays: 6, burnKcal: 1200, intakeMax: 900, mealsPerDay: 2, strength: [{ part: "any", perWeek: 3 }], proteinG: 120 },
      man,
    );
    expect(r.leanKg!).toBeLessThan(0);
    expect(r.muscleKg).toBe(0);
  });

  it("FFMI 가 상한에 가까우면 근성장이 줄어든다", () => {
    expect(ffmiFactor(57, 175, "male")).toBeGreaterThan(ffmiFactor(72, 175, "male"));
    expect(ffmiFactor(80, 175, "male")).toBe(0.1);
  });
});
