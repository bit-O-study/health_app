import { describe, it, expect } from "vitest";
import {
  parseBodyCompScan,
  BODY_COMP_FIELDS,
} from "@/features/body-composition/parse-body-comp";

describe("parseBodyCompScan — 인바디 AI 응답 파서", () => {
  it("완전한 JSON은 14필드 모두 파싱", () => {
    const json = JSON.stringify({
      weightKg: 72.5,
      skeletalMuscleKg: 34.2,
      bodyFatKg: 12.1,
      bodyFatPct: 16.7,
      muscleRightArm: 3.8,
      muscleLeftArm: 3.7,
      muscleTrunk: 26.1,
      muscleRightLeg: 9.9,
      muscleLeftLeg: 9.8,
      fatRightArm: 0.6,
      fatLeftArm: 0.7,
      fatTrunk: 6.2,
      fatRightLeg: 1.9,
      fatLeftLeg: 2.0,
    });
    const out = parseBodyCompScan(json);
    expect(Object.keys(out).length).toBe(BODY_COMP_FIELDS.length);
    expect(out.weightKg).toBe(72.5);
    expect(out.bodyFatPct).toBe(16.7);
    expect(out.fatLeftLeg).toBe(2);
  });

  it("null·비숫자·범위밖 값은 생략", () => {
    const json = JSON.stringify({
      weightKg: 70,
      skeletalMuscleKg: null,
      bodyFatKg: "abc",
      bodyFatPct: 0, // 0은 생략(양수만)
      muscleTrunk: 1234, // 1000 이상 생략
    });
    const out = parseBodyCompScan(json);
    expect(out.weightKg).toBe(70);
    expect(out.skeletalMuscleKg).toBeUndefined();
    expect(out.bodyFatKg).toBeUndefined();
    expect(out.bodyFatPct).toBeUndefined();
    expect(out.muscleTrunk).toBeUndefined();
  });

  it("코드펜스·설명이 섞여도 JSON만 추출", () => {
    const text = "다음은 결과입니다:\n```json\n{\"weightKg\": 65.4}\n```\n확인하세요.";
    expect(parseBodyCompScan(text).weightKg).toBe(65.4);
  });

  it("소수 1자리 반올림", () => {
    expect(parseBodyCompScan('{"weightKg": 72.456}').weightKg).toBe(72.5);
  });

  it("JSON이 아니면 빈 객체", () => {
    expect(parseBodyCompScan("헛소리")).toEqual({});
    expect(parseBodyCompScan("")).toEqual({});
  });
});
