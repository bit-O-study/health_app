import { describe, expect, it } from "vitest";

import {
  ageOf,
  cleanSurveyExtra,
  defaultBodyStyleChoice,
  fitPickCount,
  targetStyleFor,
} from "@/features/profile/survey-extra";
import { basalMetabolicRate, dailyTarget } from "@/features/diet/calorie-target";

describe("가입 설문 3문항 (2026-10-01)", () => {
  it("나이대 → 대표 나이, 모르면 null", () => {
    expect(ageOf("20s")).toBe(25);
    expect(ageOf("50plus")).toBe(57);
    expect(ageOf(null)).toBeNull();
  });

  it("🔴 몸 목표 스타일이 목표 비율 표를 고른다 — 성별로 정해 버리지 않는다", () => {
    expect(targetStyleFor("upper", "female")).toBe("male"); // 상체를 키우고 싶은 여성
    expect(targetStyleFor("lower", "male")).toBe("female");
    expect(targetStyleFor("balanced", "male")).toBe("balanced");
    expect(targetStyleFor(null, "female")).toBe("female");
    expect(targetStyleFor(null, "male")).toBe("male");
  });

  it("기본 스타일 — 남 상체 위주 · 여 하체 위주", () => {
    expect(defaultBodyStyleChoice("male")).toBe("upper");
    expect(defaultBodyStyleChoice("female")).toBe("lower");
  });

  it("1회 운동 시간 → 맞춤 운동 추천 개수", () => {
    expect(fitPickCount(30)).toBe(2);
    expect(fitPickCount(45)).toBe(3);
    expect(fitPickCount(60)).toBe(4);
    expect(fitPickCount(null)).toBe(3);
  });

  it("저장 전 검사 — 모르는 값은 null", () => {
    expect(cleanSurveyExtra({ ageGroup: "30s", bodyStyle: "upper", sessionMinutes: 45 })).toEqual({
      ageGroup: "30s",
      bodyStyle: "upper",
      sessionMinutes: 45,
    });
    expect(cleanSurveyExtra({ ageGroup: "70s", bodyStyle: "huge", sessionMinutes: 20 })).toEqual({
      ageGroup: null,
      bodyStyle: null,
      sessionMinutes: null,
    });
    expect(cleanSurveyExtra(null)).toEqual({ ageGroup: null, bodyStyle: null, sessionMinutes: null });
  });
});

describe("🔴 나이를 칼로리에 반영 — 예전엔 모두 30세", () => {
  const body = { gender: "male" as const, weightKg: 70, heightCm: 175 };
  it("나이를 모르면 30세 그대로(기존 값 유지)", () => {
    expect(basalMetabolicRate(body)).toBe(basalMetabolicRate({ ...body, age: 30 }));
  });
  it("나이가 많을수록 기초대사량이 낮다(10년에 50kcal)", () => {
    expect(basalMetabolicRate({ ...body, age: 25 }) - basalMetabolicRate({ ...body, age: 35 })).toBe(50);
    expect(dailyTarget({ ...body, age: 57 }).kcal).toBeLessThan(dailyTarget({ ...body, age: 25 }).kcal);
  });
});
