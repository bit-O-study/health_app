import { describe, expect, it } from "vitest";

import {
  KO_NAME_TO_MUSCLES,
  musclesForKoreanNames,
} from "@/features/workout-timer/muscle-body-map";
import { DAY_BLOCKS } from "@/features/routine/data";

// 루틴 일자 요약 '자극 부위'를 텍스트 대신 인체 그림으로 보여주려면, DAY_BLOCKS 의
// 한국어 근육명이 전부 하이라이트 근육으로 매핑돼야 한다(유산소만 예외).

describe("musclesForKoreanNames — 한국어 근육명 → 하이라이트 근육", () => {
  it("하체 세부(대퇴사두·둔근·햄스트링·종아리)를 각 근육으로", () => {
    expect(
      musclesForKoreanNames(["대퇴사두", "둔근", "햄스트링", "종아리"]),
    ).toEqual(["quadriceps", "gluteal", "hamstring", "calves"]);
  });

  it("복근은 abs, 유산소는 하이라이트 없음(빈 결과에 기여 안 함)", () => {
    expect(musclesForKoreanNames(["복근", "유산소"])).toEqual(["abs"]);
  });

  it("중복 근육은 한 번만(상·중·하부 대흉근 → chest 하나)", () => {
    expect(
      musclesForKoreanNames(["상부 대흉근", "중부 대흉근", "하부 대흉근"]),
    ).toEqual(["chest"]);
  });

  it("큰 부위(하체)는 여러 근육으로 확장", () => {
    expect(musclesForKoreanNames(["하체"])).toEqual([
      "quadriceps",
      "hamstring",
      "gluteal",
      "calves",
    ]);
  });

  it("모르는 이름은 무시(빈 배열)", () => {
    expect(musclesForKoreanNames(["존재하지않는근육"])).toEqual([]);
    expect(musclesForKoreanNames([])).toEqual([]);
  });

  it("🔴 DAY_BLOCKS 의 모든 근육명이 매핑돼 있다(유산소 제외) — 텍스트가 인체로 빠짐없이 표현됨", () => {
    const unmapped = new Set<string>();
    for (const { day } of Object.values(DAY_BLOCKS)) {
      for (const name of day.muscles) {
        if (name === "유산소") continue; // 유산소는 특정 근육 없음(의도적 예외)
        if (!KO_NAME_TO_MUSCLES[name]) unmapped.add(name);
      }
    }
    expect([...unmapped]).toEqual([]);
  });
});
