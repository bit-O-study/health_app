import { describe, expect, it } from "vitest";

import {
  BREAK_OPTIONS,
  INTAKE_FLOOR,
  MAX_MISSIONS,
  buildMissions,
  burnTarget,
  cardioTarget,
  deadlineOf,
  intakeTarget,
  isBreakId,
  proteinTarget,
  surveyTitleOf,
  type KnownProfile,
  type SurveyInput,
} from "@/features/commitments/survey";
import {
  achievementForDay,
  EMPTY_DAY,
  missionLabel,
  sanitizeMissions,
} from "@/features/commitments/missions";

/**
 * 다짐 설문(2026-09-25 설계).
 * 묻는 건 네 가지뿐이고(기간·무너지는 것·시간·주 며칠) 숫자는 프로필에서 계산된다.
 */

/** 검수보고서의 예시 계정 — 여성 · 고급 · 96.7kg · 감량 · 권장 2,650kcal. */
const ME: KnownProfile = {
  gender: "female",
  experience: "advanced",
  weightKg: 96.7,
  goal: "lose",
  recommendKcal: 2650,
};

const INPUT: SurveyInput = {
  weeks: 4,
  breaks: [],
  minutes: 30,
  perWeek: 5,
  remindAt: "20:00",
};

describe("목표치 계산 — 보고서의 검산값과 같아야 한다", () => {
  it("소비 kcal = 체중 × 시간계수 × 경력계수 (10 단위)", () => {
    // 96.7 × 4 × 1.15 = 444.8 → 10 단위 반올림 440
    expect(burnTarget(ME, 30)).toBe(440);
    // 시간이 줄면 목표도 준다.
    expect(burnTarget(ME, 15)).toBeLessThan(burnTarget(ME, 30));
    expect(burnTarget(ME, 60)).toBeGreaterThan(burnTarget(ME, 30));
  });

  it("초보자는 같은 시간이어도 목표가 낮다", () => {
    const rookie = { ...ME, experience: "beginner" as const };
    expect(burnTarget(rookie, 30)).toBeLessThan(burnTarget(ME, 30));
  });

  it("섭취 상한 = 권장 × (1 − 적자), 주 며칠에 따라 적자가 다르다 (50 단위)", () => {
    expect(intakeTarget(ME, 5)).toBe(2250); // 2650 × 0.85 = 2252.5 → 2250
    expect(intakeTarget(ME, 3)).toBe(2400); // 적자 10%
    expect(intakeTarget(ME, 7)).toBe(2100); // 적자 20%
  });

  it("🔴 섭취 상한은 하한 밑으로 내려가지 않는다", () => {
    const tiny = { ...ME, recommendKcal: 1000 };
    expect(intakeTarget(tiny, 7)).toBe(INTAKE_FLOOR.female);
    expect(intakeTarget({ ...tiny, gender: "male" }, 7)).toBe(INTAKE_FLOOR.male);
  });

  it("단백질 = 체중 × 목표 계수 (5 단위)", () => {
    expect(proteinTarget(ME)).toBe(145); // 96.7 × 1.5 = 145.05
    expect(proteinTarget({ ...ME, goal: "gain" })).toBe(155);
    expect(proteinTarget({ ...ME, goal: "maintain" })).toBe(115);
  });

  it("유산소 = 시간 예산 × 경력계수 (5 단위)", () => {
    expect(cardioTarget(ME, 30)).toBe(30);
    expect(cardioTarget(ME, 15)).toBe(15);
  });
});

describe("설문 → 미션", () => {
  it("아무것도 안 골라도 목표에 맞는 기본 미션이 하나 들어간다", () => {
    const ms = buildMissions(ME, INPUT);
    expect(ms).toHaveLength(1);
    expect(ms[0].type).toBe("burn_kcal");
    expect(ms[0].target).toBe(440);
    expect(ms[0].why).toContain("96.7kg");
  });

  it("목표마다 기본 미션이 다르다", () => {
    const of = (goal: KnownProfile["goal"]) =>
      buildMissions({ ...ME, goal }, INPUT)[0].type;
    expect(of("lose")).toBe("burn_kcal");
    expect(of("gain")).toBe("protein_min");
    expect(of("maintain")).toBe("workout_today");
    expect(of("stamina")).toBe("cardio_min");
  });

  it("판정할 수 있는 항목은 자동 미션이 된다", () => {
    const ms = buildMissions(ME, { ...INPUT, breaks: ["late", "nogym"] });
    expect(ms.map((m) => m.type)).toEqual([
      "burn_kcal",
      "no_late_snack",
      "workout_today",
    ]);
  });

  it("판정할 수 없는 항목은 수동 체크가 된다 — 문구까지 붙는다", () => {
    const ms = buildMissions(ME, { ...INPUT, breaks: ["water", "drink"] });
    const manual = ms.filter((m) => m.type === "manual_check");
    expect(manual.map((m) => m.label)).toEqual(["물 2L 마시기", "술 안 마시기"]);
    expect(manual[0].why).toContain("직접 체크");
  });

  it(`미션은 ${MAX_MISSIONS}개를 넘지 않는다`, () => {
    const ms = buildMissions(ME, {
      ...INPUT,
      breaks: ["late", "nogym", "water"],
    });
    expect(ms).toHaveLength(MAX_MISSIONS);
  });

  it("같은 미션이 두 번 들어가지 않는다", () => {
    // 폭식(intake_max)과 야식(no_late_snack)은 서로 다른 미션이지만,
    // 식사 거르기·폭식이 증량에서는 둘 다 meal_count 가 된다.
    const gain = { ...ME, goal: "gain" as const };
    const ms = buildMissions(gain, { ...INPUT, breaks: ["skip", "binge"] });
    const types = ms.map((m) => m.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it("🔴 증량 목표에 '폭식'을 고르면 섭취 상한 대신 끼니 수로 바뀐다", () => {
    const gain = { ...ME, goal: "gain" as const };
    const ms = buildMissions(gain, { ...INPUT, breaks: ["binge"] });
    expect(ms.map((m) => m.type)).not.toContain("intake_max");
    expect(ms.map((m) => m.type)).toContain("meal_count");
  });

  it("모든 미션에 id 와 why 가 붙는다", () => {
    const ms = buildMissions(ME, { ...INPUT, breaks: ["water", "nogym"] });
    expect(ms.map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
    expect(ms.every((m) => (m.why ?? "").length > 0)).toBe(true);
  });
});

describe("저장·복원", () => {
  it("만든 미션은 정규화를 그대로 통과한다(id·label·why 보존)", () => {
    const ms = buildMissions(ME, { ...INPUT, breaks: ["water", "drink"] });
    const back = sanitizeMissions(JSON.parse(JSON.stringify(ms)));
    expect(back).toEqual(ms);
  });

  it("옛 데이터(id 없음)를 읽으면 id 를 채워 준다", () => {
    const back = sanitizeMissions([
      { type: "workout_today", target: 0 },
      { type: "burn_kcal", target: 300 },
    ]);
    expect(back.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("수동 미션은 문구가 다르면 서로 다른 미션이다", () => {
    const back = sanitizeMissions([
      { type: "manual_check", target: 0, label: "물 2L 마시기" },
      { type: "manual_check", target: 0, label: "술 안 마시기" },
    ]);
    expect(back).toHaveLength(2);
  });

  it("문구 없는 수동 미션은 버린다 — 화면에 '직접 체크'만 뜨는 줄이 생기면 안 된다", () => {
    expect(sanitizeMissions([{ type: "manual_check", target: 0 }])).toEqual([]);
  });
});

describe("하루 판정 — 수동은 체크로, 자동은 기록으로", () => {
  const ms = buildMissions(ME, { ...INPUT, breaks: ["water"] });

  it("체크하지 않으면 수동 미션은 미달성", () => {
    const r = achievementForDay(ms, { ...EMPTY_DAY, burnKcal: 500 });
    expect(r.done).toBe(1); // burn_kcal 만
    expect(r.total).toBe(2);
  });

  it("체크하면 달성으로 센다", () => {
    const manual = ms.find((m) => m.type === "manual_check")!;
    const r = achievementForDay(ms, { ...EMPTY_DAY, burnKcal: 500 }, [manual.id!]);
    expect(r.done).toBe(2);
    expect(r.pct).toBe(100);
  });

  it("🔴 자동 미션은 체크해도 기록이 없으면 달성이 아니다", () => {
    const r = achievementForDay(ms, EMPTY_DAY, ["m1", "m2"]);
    // m1 = burn_kcal(자동) 은 기록이 없으니 미달성, m2 = 수동만 달성.
    expect(r.done).toBe(1);
  });
});

describe("문구·기간", () => {
  it("제목은 기간과 목표에서 만든다", () => {
    expect(surveyTitleOf(ME, 4)).toBe("4주 감량 다짐");
    expect(surveyTitleOf({ ...ME, goal: "gain" }, 8)).toBe("8주 증량 다짐");
  });

  it("마감일은 시작일 포함 weeks × 7일", () => {
    expect(deadlineOf("2026-09-26", 4)).toBe("2026-10-23");
    expect(deadlineOf("2026-09-26", 2)).toBe("2026-10-09");
  });

  it("수동 미션의 화면 문구는 사용자가 쓴 그대로", () => {
    const ms = buildMissions(ME, { ...INPUT, breaks: ["water"] });
    expect(missionLabel(ms[1])).toBe("물 2L 마시기");
  });

  it("고를 수 있는 항목은 전부 유효하다", () => {
    expect(BREAK_OPTIONS).toHaveLength(8);
    expect(BREAK_OPTIONS.every((b) => isBreakId(b.id))).toBe(true);
    expect(isBreakId("nope")).toBe(false);
  });
});
