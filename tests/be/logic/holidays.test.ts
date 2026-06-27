import { describe, expect, it } from "vitest";

import { getDayMarks, isHoliday } from "@/features/calendar/holidays";

const name = (ymd: string) =>
  getDayMarks(ymd).find((m) => m.kind === "holiday")?.name;
const bokName = (ymd: string) =>
  getDayMarks(ymd).find((m) => m.kind === "bok")?.name;

describe("공휴일 자동 계산 — 고정·음력", () => {
  it("고정 공휴일(신정·삼일절·성탄절)", () => {
    expect(name("2026-01-01")).toBe("신정");
    expect(name("2026-03-01")).toBe("삼일절");
    expect(name("2026-12-25")).toBe("성탄절");
  });

  it("음력 공휴일(설날·추석·부처님오신날)", () => {
    expect(name("2026-02-17")).toBe("설날"); // 음력 1/1
    expect(name("2026-09-25")).toBe("추석"); // 음력 8/15
    expect(name("2026-05-24")).toBe("부처님오신날"); // 음력 4/8
    expect(name("2027-02-07")).toBe("설날");
    expect(name("2027-09-15")).toBe("추석");
  });

  it("제헌절은 2026년부터 다시 공휴일(그 전엔 아님)", () => {
    expect(isHoliday("2025-07-17")).toBe(false);
    expect(name("2026-07-17")).toBe("제헌절");
    expect(name("2027-07-17")).toBe("제헌절");
  });
});

describe("대체공휴일 규칙 — 검증된 연도 재현", () => {
  it("2025년 대체공휴일", () => {
    expect(name("2025-03-03")).toBe("대체공휴일"); // 삼일절(토)
    expect(name("2025-05-06")).toBe("대체공휴일"); // 어린이날=부처님(겹침)
    expect(name("2025-10-08")).toBe("대체공휴일"); // 추석(일 겹침)
  });

  it("2026년 대체공휴일", () => {
    expect(name("2026-03-02")).toBe("대체공휴일"); // 삼일절(일)
    expect(name("2026-05-25")).toBe("대체공휴일"); // 부처님(일)
    expect(name("2026-08-17")).toBe("대체공휴일"); // 광복절(토)
    expect(name("2026-10-05")).toBe("대체공휴일"); // 개천절(토)
    // 추석 9/24~26 중 일요일 없음 → 대체 없음
    expect(isHoliday("2026-09-28")).toBe(false);
  });

  it("2027년 대체공휴일", () => {
    expect(name("2027-02-09")).toBe("대체공휴일"); // 설날(일 겹침)
    expect(name("2027-07-19")).toBe("대체공휴일"); // 제헌절(토)
    expect(name("2027-08-16")).toBe("대체공휴일"); // 광복절(일)
    expect(name("2027-10-04")).toBe("대체공휴일"); // 개천절(일)
    expect(name("2027-10-11")).toBe("대체공휴일"); // 한글날(토)
    expect(name("2027-12-27")).toBe("대체공휴일"); // 성탄절(토)
  });

  it("현충일은 대체공휴일 대상이 아니다(2027 일요일이어도)", () => {
    expect(name("2027-06-06")).toBe("현충일");
    expect(isHoliday("2027-06-07")).toBe(false);
  });
});

describe("복날(삼복) 자동 계산", () => {
  it("2025·2026·2027 초복·중복·말복", () => {
    expect(bokName("2025-07-20")).toBe("초복");
    expect(bokName("2025-07-30")).toBe("중복");
    expect(bokName("2025-08-09")).toBe("말복");
    expect(bokName("2026-07-15")).toBe("초복");
    expect(bokName("2026-07-25")).toBe("중복");
    expect(bokName("2026-08-14")).toBe("말복");
    expect(bokName("2027-07-20")).toBe("초복");
    expect(bokName("2027-08-09")).toBe("말복");
  });

  it("복날은 공휴일이 아니다", () => {
    expect(isHoliday("2026-07-15")).toBe(false);
  });
});

describe("미래 연도도 자동 산출(표 없이)", () => {
  it("2030년 고정 공휴일", () => {
    expect(name("2030-01-01")).toBe("신정");
    expect(name("2030-03-01")).toBe("삼일절");
    expect(name("2030-12-25")).toBe("성탄절");
    expect(name("2030-07-17")).toBe("제헌절");
  });

  it("2030년 설날·추석·복날이 존재", () => {
    // 설날(음 1/1)·추석(음 8/15)은 양력 날짜가 매년 바뀌어도 자동 계산된다.
    let seolDays = 0;
    for (let m = 1; m <= 3; m++) {
      for (let d = 1; d <= 28; d++) {
        if (name(`2030-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`) === "설날")
          seolDays++;
      }
    }
    expect(seolDays).toBe(3); // 연휴 3일

    let bokCount = 0;
    for (let m = 7; m <= 8; m++) {
      for (let d = 1; d <= 31; d++) {
        const v = bokName(`2030-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
        if (v) bokCount++;
      }
    }
    expect(bokCount).toBe(3); // 초·중·말복
  });

  it("평범한 날은 마크 없음", () => {
    expect(getDayMarks("2026-06-22")).toEqual([]);
    expect(isHoliday("2026-06-22")).toBe(false);
  });
});
