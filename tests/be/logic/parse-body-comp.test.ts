import { describe, it, expect } from "vitest";
import {
  parseBodyCompScan,
  parseLabeledBodyCompScan,
  checkBodyCompScan,
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

describe("인바디 항목명·단위 교차 검증", () => {
  it("체수분 48L를 weightKg로 반환해도 체중으로 채우지 않는다", () => {
    expect(parseLabeledBodyCompScan(JSON.stringify({ weightKg: { value: 48, label: "체수분", unit: "L" } }))).toEqual({});
    expect(parseLabeledBodyCompScan(JSON.stringify({ weightKg: { value: 48, label: "Total Body Water", unit: "kg" } }))).toEqual({});
  });
  it("명시된 체중 98kg 및 서로 다른 기본 항목을 구분한다", () => {
    expect(parseLabeledBodyCompScan(JSON.stringify({
      weightKg: { value: 98, label: "체중", unit: "kg" },
      skeletalMuscleKg: { value: 40, label: "골격근량", unit: "kg" },
      bodyFatKg: { value: 25, label: "체지방량", unit: "kg" },
      bodyFatPct: { value: 25.5, label: "Percent Body Fat", unit: "%" },
    }))).toEqual({ weightKg: 98, skeletalMuscleKg: 40, bodyFatKg: 25, bodyFatPct: 25.5 });
  });
  it("체중조절·적정체중·제지방량·단백질을 체중으로 받아들이지 않는다", () => {
    for (const label of ["체중조절", "적정체중", "제지방량", "단백질"]) {
      expect(parseLabeledBodyCompScan(JSON.stringify({ weightKg: { value: 48, label, unit: "kg" } }))).toEqual({});
    }
  });
  it("부위별 근육/지방 구역과 kg/%가 서로 바뀌면 제외한다", () => {
    expect(parseLabeledBodyCompScan(JSON.stringify({
      muscleRightArm: { value: 3.5, label: "오른팔", unit: "kg", section: "부위별근육분석" },
      muscleLeftArm: { value: 110, label: "왼팔", unit: "%", section: "부위별근육분석" },
      fatRightArm: { value: 3.5, label: "오른팔", unit: "kg", section: "부위별근육분석" },
    }))).toEqual({ muscleRightArm: 3.5 });
  });
  it("근거 없는 숫자·boolean·불명확한 항목은 채우지 않는다", () => {
    expect(parseLabeledBodyCompScan(JSON.stringify({ weightKg: 48, bodyFatKg: { value: true, label: "체지방량", unit: "kg" } }))).toEqual({});
  });
});
describe("체중·체지방 수치 일관성", () => {
  it("체수분을 체중으로 오인한 수치는 추측해 고치지 않고 제외한다", () => {
    const input = { weightKg: 48, bodyFatKg: 25, bodyFatPct: 25.5, skeletalMuscleKg: 40 };
    const result = checkBodyCompScan(input);
    expect(result.values).toEqual({ skeletalMuscleKg: 40 });
    expect(result.warnings).toHaveLength(1);
    expect(input.weightKg).toBe(48);
  });
  it("실제 체중과 반올림 오차는 유지하고, 비교할 값이 없으면 추측하지 않는다", () => {
    expect(checkBodyCompScan({ weightKg: 98, bodyFatKg: 25, bodyFatPct: 25.5 }).warnings).toEqual([]);
    expect(checkBodyCompScan({ weightKg: 98 }).values).toEqual({ weightKg: 98 });
  });
});