import { describe, expect, it } from "vitest";

import {
  DEFAULT_REST_SEC,
  clampRest,
  formatRest,
  isLastSet,
  setProgressLabel,
  minSelectableSets,
  clampTotalSets,
} from "@/features/workout-timer/rest-logic";

describe("rest-logic — 휴식 타이머 계산", () => {
  describe("clampRest", () => {
    it("범위 안은 그대로(반올림)", () => {
      expect(clampRest(90)).toBe(90);
      expect(clampRest(89.6)).toBe(90);
    });
    it("범위 밖은 보정", () => {
      expect(clampRest(5)).toBe(10);
      expect(clampRest(9999)).toBe(600);
    });
    it("무효값은 기본값", () => {
      expect(clampRest(null)).toBe(DEFAULT_REST_SEC);
      expect(clampRest(undefined)).toBe(DEFAULT_REST_SEC);
      expect(clampRest(NaN)).toBe(DEFAULT_REST_SEC);
    });
  });

  describe("formatRest", () => {
    it("m:ss 포맷", () => {
      expect(formatRest(90)).toBe("1:30");
      expect(formatRest(5)).toBe("0:05");
      expect(formatRest(0)).toBe("0:00");
      expect(formatRest(-3)).toBe("0:00");
      expect(formatRest(125)).toBe("2:05");
    });
  });

  describe("setProgressLabel / isLastSet", () => {
    it("진행 라벨은 1-base", () => {
      expect(setProgressLabel(0, 4)).toBe("세트 1/4");
      expect(setProgressLabel(3, 4)).toBe("세트 4/4");
      expect(setProgressLabel(5, 4)).toBe("세트 4/4"); // 초과 방지
    });
    it("마지막 세트 판별", () => {
      expect(isLastSet(0, 4)).toBe(false);
      expect(isLastSet(3, 4)).toBe(true);
      expect(isLastSet(0, 1)).toBe(true);
    });
  });

  describe("minSelectableSets / clampTotalSets — 완료 세트 아래로 못 내림", () => {
    it("완료분이 하한(최소 1)", () => {
      expect(minSelectableSets(0)).toBe(1);
      expect(minSelectableSets(4)).toBe(4);
      expect(minSelectableSets(-2)).toBe(1);
      expect(minSelectableSets(NaN)).toBe(1);
      expect(minSelectableSets(3.9)).toBe(3);
    });
    it("완료분보다 적게 요청하면 완료분으로 올림", () => {
      // 4세트 완료 상태에서 3으로 줄이려 하면 4로 고정
      expect(clampTotalSets(3, 4)).toBe(4);
      expect(clampTotalSets(1, 4)).toBe(4);
      // 완료분 이상은 그대로
      expect(clampTotalSets(6, 4)).toBe(6);
      expect(clampTotalSets(5, 0)).toBe(5);
      // 아무것도 완료 안 했으면 최소 1
      expect(clampTotalSets(0, 0)).toBe(1);
    });
  });
});
