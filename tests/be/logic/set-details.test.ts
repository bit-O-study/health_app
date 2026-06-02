import { describe, expect, it } from "vitest";

import {
  isValidSetDetails,
  parseSetDetails,
  summarizeSetDetails,
  toRowFields,
  type SetDetail,
} from "@/features/routine/set-details";

// 피라미드/드롭세트(세트별 다른 kg) 기능의 핵심 직렬화·검증 로직.
describe("set-details (세트별 무게·횟수)", () => {
  describe("parseSetDetails", () => {
    it("null/빈 배열/비배열은 균일모드(null) 로", () => {
      expect(parseSetDetails(null)).toBeNull();
      expect(parseSetDetails([])).toBeNull();
      expect(parseSetDetails("x")).toBeNull();
    });

    it("정상 jsonb → SetDetail[]", () => {
      const out = parseSetDetails([
        { weightKg: 40, reps: 12 },
        { weightKg: 50, reps: 10 },
        { weightKg: null, reps: 8 },
      ]);
      expect(out).toEqual([
        { weightKg: 40, reps: 12 },
        { weightKg: 50, reps: 10 },
        { weightKg: null, reps: 8 },
      ]);
    });

    it('빈 문자열 weightKg 는 맨몸(null)', () => {
      expect(parseSetDetails([{ weightKg: "", reps: 5 }])).toEqual([
        { weightKg: null, reps: 5 },
      ]);
    });

    it("범위 밖 값은 통째로 거부(null)", () => {
      expect(parseSetDetails([{ weightKg: 40, reps: 0 }])).toBeNull();
      expect(parseSetDetails([{ weightKg: 40, reps: 101 }])).toBeNull();
      expect(parseSetDetails([{ weightKg: 1001, reps: 10 }])).toBeNull();
      expect(parseSetDetails([{ weightKg: -1, reps: 10 }])).toBeNull();
    });
  });

  describe("isValidSetDetails", () => {
    it("1~20세트, reps 1~100, weight null|0~1000 통과", () => {
      const ok: SetDetail[] = [
        { weightKg: 40, reps: 12 },
        { weightKg: null, reps: 10 },
      ];
      expect(isValidSetDetails(ok)).toBe(true);
    });
    it("세트 0개 또는 21개 이상 거부", () => {
      expect(isValidSetDetails([])).toBe(false);
      expect(
        isValidSetDetails(Array.from({ length: 21 }, () => ({ weightKg: 1, reps: 1 }))),
      ).toBe(false);
    });
    it("잘못된 reps/weight 거부", () => {
      expect(isValidSetDetails([{ weightKg: 40, reps: 0 }])).toBe(false);
      expect(isValidSetDetails([{ weightKg: 2000, reps: 10 }])).toBe(false);
    });
  });

  describe("toRowFields (DB 행 환산)", () => {
    it("세트별 있으면 길이=sets, 첫 세트가 대표 reps/weight, set_details 보존", () => {
      const sd: SetDetail[] = [
        { weightKg: 40, reps: 12 },
        { weightKg: 50, reps: 10 },
        { weightKg: 60, reps: 8 },
      ];
      expect(toRowFields({ sets: 3, reps: 10, weightKg: 50, setDetails: sd })).toEqual({
        sets: 3,
        reps: 12,
        weight_kg: 40,
        set_details: sd,
      });
    });
    it("세트별 없으면 균일값 그대로, set_details=null", () => {
      expect(toRowFields({ sets: 4, reps: 10, weightKg: 60 })).toEqual({
        sets: 4,
        reps: 10,
        weight_kg: 60,
        set_details: null,
      });
    });
  });

  describe("summarizeSetDetails", () => {
    it("표시 요약 — 맨몸 포함", () => {
      expect(
        summarizeSetDetails([
          { weightKg: 40, reps: 12 },
          { weightKg: null, reps: 10 },
        ]),
      ).toBe("40kg×12회 · 맨몸×10회");
    });
  });
});
