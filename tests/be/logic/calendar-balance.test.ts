import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  EVEN_BAND_PER_DAY,
  calorieBalance,
  dayAriaLabel,
  directionLabel,
  signedKcal,
} from "@/features/calendar/calorie-balance";
import { calendarWeek } from "@/features/launcher/calendar-range";

const day = (intake: number, exerciseKcal = 0, stepsKcal = 0) => ({ intake, exerciseKcal, stepsKcal });

describe("캘린더 칼로리 수지 — 기초대사량 포함, 식단 기록한 날만", () => {
  it("🔴 예전 버그: 2,000 먹고 300 운동하면 −1,700 '적자' 였다 → 기초대사량을 넣으면 거의 균형", () => {
    const b = calorieBalance([day(2000, 300)], 1650);
    // 2000 − (1650 + 300) = +50 → 하루 ±100 안이라 균형
    expect(b.netKcal).toBe(50);
    expect(b.direction).toBe("even");
    expect(directionLabel(b)).toBe("균형");
  });

  it("쓴 게 더 많으면 음수 · 살 빠지는 쪽", () => {
    const b = calorieBalance([day(1500, 400, 200)], 1650);
    expect(b.netKcal).toBe(1500 - (1650 + 400 + 200));
    expect(b.direction).toBe("loss");
    expect(directionLabel(b)).toBe("살 빠지는 쪽");
    expect(signedKcal(b.netKcal)).toBe("−750");
  });

  it("먹은 게 더 많으면 양수 · 살 찌는 쪽", () => {
    const b = calorieBalance([day(2800, 100)], 1650);
    expect(b.netKcal).toBe(1050);
    expect(b.direction).toBe("gain");
    expect(signedKcal(b.netKcal)).toBe("+1,050");
  });

  it("🔴 식단을 안 적은 날은 빼고 센다 — 먹은 게 0 으로 잡혀 빠지는 쪽으로 기울지 않게", () => {
    const b = calorieBalance([day(2000, 0), day(0, 500, 200), day(0, 0, 0)], 1650);
    expect(b.loggedDays).toBe(1);
    expect(b.bmrKcal).toBe(1650);
    expect(b.exerciseKcal).toBe(0); // 기록 없는 날의 운동은 합에 안 들어간다
    expect(b.netKcal).toBe(350);
  });

  it("식단 기록이 하나도 없으면 판단하지 않는다", () => {
    const b = calorieBalance([day(0, 500)], 1650);
    expect(b.loggedDays).toBe(0);
    expect(b.direction).toBe("even");
    expect(directionLabel(b)).toBe("식단 기록 없음");
  });

  it("균형 폭은 날 수에 비례한다(하루 ±100)", () => {
    const days = Array.from({ length: 10 }, () => day(1650 + 90));
    const b = calorieBalance(days, 1650);
    expect(b.netKcal).toBe(900);
    expect(Math.abs(b.netKcal)).toBeLessThanOrEqual(EVEN_BAND_PER_DAY * 10);
    expect(b.direction).toBe("even");
  });

  it("기초대사량이 이상한 값이면 0 으로 본다(NaN 전파 방지)", () => {
    expect(calorieBalance([day(1000)], Number.NaN).netKcal).toBe(1000);
  });
});

describe("달력 칸 읽기 문장", () => {
  it("날짜·요일·오늘·공휴일·먹은/움직인 kcal·근력·다짐·생리를 순서대로", () => {
    expect(
      dayAriaLabel({
        date: "2026-09-25",
        isToday: true,
        holiday: "추석",
        intake: 1200,
        burned: 300,
        didWeight: true,
        missionPct: 67,
        period: "predicted",
      }),
    ).toBe("9월 25일 금요일, 오늘, 추석, 먹은 1,200kcal, 움직인 300kcal, 근력운동, 다짐 67%, 생리 예정");
  });

  it("기록 없는 날은 날짜만", () => {
    expect(dayAriaLabel({ date: "2026-09-28", isToday: false, intake: 0, burned: 0, didWeight: false })).toBe(
      "9월 28일 월요일",
    );
  });
});

describe("주간 범위(calendarWeek)", () => {
  it("월요일 시작 7일, 앞뒤 주", () => {
    const w = calendarWeek("2026-10-01", "2026-09-29");
    expect(w.from).toBe("2026-09-28");
    expect(w.to).toBe("2026-10-04");
    expect(w.dates).toHaveLength(7);
    expect(w.previous).toBe("2026-09-21");
    expect(w.next).toBe("2026-10-05");
  });

  it("이상한 날짜는 오늘 기준", () => {
    expect(calendarWeek("2026-02-30", "2026-09-29").from).toBe("2026-09-28");
    expect(calendarWeek("abc", "2026-09-29").from).toBe("2026-09-28");
  });
});

describe("캘린더 화면 가드", () => {
  const page = readFileSync("src/app/calendar/page.tsx", "utf8");

  it("죽은 화면(view=goals·view=stats)이 없다", () => {
    expect(page).not.toContain('view === "goals"');
    expect(page).not.toContain('view === "stats"');
  });

  it("범례·읽기 문장·오늘 표시가 달려 있다", () => {
    expect(page).toContain("<CalendarLegend");
    expect(page).toContain("aria-label={dayAriaLabel(");
    expect(page).toContain('aria-current={isToday ? "date" : undefined}');
  });

  it("🔴 '흑자/적자' 라벨을 쓰지 않는다 — 사람마다 반대로 읽는다", () => {
    expect(page).not.toContain("칼로리 흑자");
    expect(page).not.toContain("칼로리 적자");
  });
});
