import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  adjacentDays,
  distanceLabel,
  durationLabel,
  paceLabel,
  rangeLabel,
  seoulDateOf,
  seoulDayRangeUtc,
  summaryTitle,
  weekOfMonthLabel,
  weekTitle,
} from "@/features/calendar/calendar-labels";
import { dayAriaLabel } from "@/features/calendar/calorie-balance";

describe("주간 머리글 — 원문 날짜 대신 사람이 말하는 식", () => {
  it("9/28–10/4 주는 목요일(10/1)이 속한 10월 첫째 주", () => {
    expect(weekOfMonthLabel("2026-09-28")).toBe("10월 첫째 주");
    expect(weekTitle("2026-09-28", "2026-10-04")).toBe("10월 첫째 주 · 9/28–10/4");
  });

  it("9/21 주는 9월 넷째 주(목요일 9/24)", () => {
    expect(weekOfMonthLabel("2026-09-21")).toBe("9월 넷째 주");
    expect(rangeLabel("2026-09-21", "2026-09-27")).toBe("9/21–9/27");
  });
});

describe("요약 제목 — 보고 있는 기간 그대로", () => {
  const today = "2026-09-29"; // 화요일, 이번 주 월요일 9/28

  it("주: 이번 주 · 지난 주 · 다음 주 · 그 밖은 몇째 주", () => {
    expect(summaryTitle({ kind: "week", from: "2026-09-28" }, today)).toBe("이번 주 요약");
    expect(summaryTitle({ kind: "week", from: "2026-09-21" }, today)).toBe("지난 주 요약");
    expect(summaryTitle({ kind: "week", from: "2026-10-05" }, today)).toBe("다음 주 요약");
    expect(summaryTitle({ kind: "week", from: "2026-09-07" }, today)).toBe("9월 둘째 주 요약");
  });

  it("달: 이번 달 · 지난 달 · 그 밖은 몇 월, 해가 다르면 연도까지", () => {
    expect(summaryTitle({ kind: "month", year: 2026, month1: 9 }, today)).toBe("이번 달 요약");
    expect(summaryTitle({ kind: "month", year: 2026, month1: 8 }, today)).toBe("지난 달 요약");
    expect(summaryTitle({ kind: "month", year: 2026, month1: 5 }, today)).toBe("5월 요약");
    expect(summaryTitle({ kind: "month", year: 2025, month1: 12 }, today)).toBe("2025년 12월 요약");
    // 1월에 보는 작년 12월은 '지난 달'.
    expect(summaryTitle({ kind: "month", year: 2025, month1: 12 }, "2026-01-10")).toBe("지난 달 요약");
  });
});

describe("런닝 표시", () => {
  it("거리·페이스·시간", () => {
    expect(distanceLabel(5230)).toBe("5.2km");
    expect(distanceLabel(5000)).toBe("5km");
    expect(distanceLabel(850)).toBe("850m");
    expect(distanceLabel(12345)).toBe("12.3km");
    expect(distanceLabel(0)).toBe("0m");
    expect(paceLabel(330)).toBe("5'30\"/km");
    expect(paceLabel(null)).toBe("—");
    expect(durationLabel(1920)).toBe("32분");
    expect(durationLabel(3900)).toBe("1시간 5분");
  });

  it("달력 칸 읽기 문장에 런닝·체중이 들어간다", () => {
    expect(
      dayAriaLabel({
        date: "2026-09-29",
        isToday: false,
        intake: 0,
        burned: 0,
        didWeight: false,
        runM: 5230,
        weighedKg: 71.2,
      }),
    ).toBe("9월 29일 화요일, 런닝 5.2km, 체중 71.2kg");
  });
});

describe("한국 날짜 ↔ UTC 시각 (체중처럼 시각만 저장된 기록)", () => {
  it("🔴 한국 새벽 0시 30분 기록은 그날로 — UTC 로는 전날이다", () => {
    expect(seoulDateOf("2026-09-28T15:30:00Z")).toBe("2026-09-29");
    expect(seoulDateOf("2026-09-29T14:59:59Z")).toBe("2026-09-29");
    expect(seoulDateOf("2026-09-29T15:00:00Z")).toBe("2026-09-30");
    expect(seoulDateOf("nope")).toBe("");
  });

  it("조회 범위는 한국 00:00 부터 다음날 00:00 전까지", () => {
    expect(seoulDayRangeUtc("2026-09-01", "2026-09-30")).toEqual({
      gte: "2026-08-31T15:00:00.000Z",
      lt: "2026-09-30T15:00:00.000Z",
    });
  });

  it("앞뒤 날짜(월·해 경계)", () => {
    expect(adjacentDays("2026-10-01")).toEqual({ prev: "2026-09-30", next: "2026-10-02" });
    expect(adjacentDays("2026-12-31").next).toBe("2027-01-01");
  });
});

describe("화면 가드 — 2단계", () => {
  const page = readFileSync("src/app/calendar/page.tsx", "utf8");
  const day = readFileSync("src/app/calendar/[date]/page.tsx", "utf8");
  const data = readFileSync("src/features/calendar/data-access.ts", "utf8");

  it("주간은 원문 날짜 머리글 대신 weekTitle, 요일별 목록(WeekList)", () => {
    expect(page).toContain("weekTitle(week.from, week.to)");
    expect(page).not.toContain("`${week.from} ~ ${week.to}`");
    expect(page).toContain("<WeekList");
  });

  it("요약 제목이 기간을 따른다(summaryTitle)", () => {
    expect(page).toContain("summaryTitle(");
    expect(page).not.toContain('isWeek ? "이번 주 요약" : "이번 달 요약"');
  });

  it("달력 칸에 런닝 거리·체중 점, 범례에도", () => {
    expect(page).toContain("distanceLabel(s.runM)");
    expect(page).toContain('aria-label="체중 잰 날"');
    expect(page).toContain("런닝 거리");
  });

  it("날짜 상세: 앞뒤 날짜·식단 바로가기·런닝·물/체중/영양소", () => {
    expect(day).toContain('aria-label="전날"');
    expect(day).toContain('aria-label="다음날"');
    expect(day).toContain("/diet?d=${date}");
    expect(day).toContain('data-testid="day-runs"');
    expect(day).toContain('data-testid="day-extras"');
  });

  it("🔴 런닝 칼로리를 두 번 세지 않는다 — 거리만 더하고 kcal 은 컨디셔닝 완료 기록 쪽", () => {
    expect(data).toContain("runM += Math.max(0, r.distanceM)");
    expect(data).not.toMatch(/caloriesKcal/);
  });
});
