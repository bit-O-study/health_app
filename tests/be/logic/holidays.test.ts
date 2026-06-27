import { describe, expect, it } from "vitest";

import { getDayMarks, isHoliday } from "@/features/calendar/holidays";

describe("공휴일·복날 마크", () => {
  it("고정 공휴일(신정·삼일절·성탄절)", () => {
    expect(isHoliday("2026-01-01")).toBe(true);
    expect(getDayMarks("2026-01-01")[0]?.name).toBe("신정");
    expect(isHoliday("2026-03-01")).toBe(true);
    expect(isHoliday("2026-12-25")).toBe(true);
  });

  it("음력 공휴일(설날·추석)과 대체공휴일", () => {
    expect(getDayMarks("2026-02-17")[0]?.name).toBe("설날");
    expect(getDayMarks("2026-09-25")[0]?.name).toBe("추석");
    // 삼일절(일) → 다음날 대체공휴일
    expect(getDayMarks("2026-03-02")[0]?.name).toBe("대체공휴일");
  });

  it("제헌절은 2026년부터 다시 공휴일", () => {
    expect(getDayMarks("2026-07-17")[0]?.name).toBe("제헌절");
    expect(isHoliday("2026-07-17")).toBe(true);
    expect(getDayMarks("2027-07-17")[0]?.name).toBe("제헌절");
  });

  it("복날은 공휴일이 아니라 'bok' 마크", () => {
    const marks = getDayMarks("2026-07-15");
    expect(marks[0]?.kind).toBe("bok");
    expect(marks[0]?.name).toBe("초복");
    expect(isHoliday("2026-07-15")).toBe(false);
  });

  it("평범한 날은 마크 없음", () => {
    expect(getDayMarks("2026-06-22")).toEqual([]);
    expect(isHoliday("2026-06-22")).toBe(false);
  });
});
