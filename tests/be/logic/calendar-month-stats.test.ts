import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  activityLevel,
  currentStreak,
  isActiveDay,
  longestRun,
  monthStats,
  plannedLabel,
  type ActivityDay,
} from "@/features/calendar/month-stats";
import { resolveRoutine } from "@/features/routine/data";

const d = (o: Partial<ActivityDay> = {}): ActivityDay => ({
  exerciseKcal: 0,
  durationSec: 0,
  didWeight: false,
  runM: 0,
  ...o,
});

describe("운동한 날", () => {
  it("근력·런닝·운동 kcal·운동 시간 중 하나면 운동한 날", () => {
    expect(isActiveDay(d({ didWeight: true }))).toBe(true);
    expect(isActiveDay(d({ runM: 3000 }))).toBe(true);
    expect(isActiveDay(d({ exerciseKcal: 120 }))).toBe(true);
    expect(isActiveDay(d({ durationSec: 600 }))).toBe(true);
  });
  it("걷기만 한 날·기록 없는 날은 아니다", () => {
    expect(isActiveDay(d())).toBe(false);
    expect(isActiveDay(undefined)).toBe(false);
  });
});

describe("운동량 농도 0~3", () => {
  it("그 기간 최대 대비 ⅓·⅔ 로 나눈다", () => {
    expect(activityLevel(0, 600)).toBe(0);
    expect(activityLevel(150, 600)).toBe(1);
    expect(activityLevel(300, 600)).toBe(2);
    expect(activityLevel(600, 600)).toBe(3);
    expect(activityLevel(100, 0)).toBe(0);
  });
});

describe("연속 운동 일수", () => {
  const set = (...ds: string[]) => new Set(ds);

  it("🔴 오늘 아직 안 했으면 어제부터 센다(아침에 열어도 끊기지 않게)", () => {
    expect(currentStreak(set("2026-09-27", "2026-09-28"), "2026-09-29")).toBe(2);
  });
  it("오늘 했으면 오늘 포함", () => {
    expect(currentStreak(set("2026-09-27", "2026-09-28", "2026-09-29"), "2026-09-29")).toBe(3);
  });
  it("어제도 안 했으면 0 · 달이 바뀌어도 이어진다", () => {
    expect(currentStreak(set("2026-09-26"), "2026-09-29")).toBe(0);
    expect(currentStreak(set("2026-08-31", "2026-09-01"), "2026-09-01")).toBe(2);
  });
  it("가장 긴 연속(순서·중복 무관)", () => {
    expect(longestRun(["2026-09-05", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-03"])).toBe(3);
    expect(longestRun([])).toBe(0);
  });
});

describe("달 요약(공유 이미지 숫자)", () => {
  it("운동한 날·근력 날·런닝 km·가장 긴 연속", () => {
    const s = monthStats([
      ["2026-09-01", d({ didWeight: true, exerciseKcal: 200 })],
      ["2026-09-02", d({ runM: 5230, exerciseKcal: 350 })],
      ["2026-09-03", d({ didWeight: true, exerciseKcal: 180 })],
      ["2026-09-05", d()], // 걷기만
      ["2026-09-06", d({ runM: 3100, exerciseKcal: 210 })],
    ]);
    expect(s).toEqual({ activeDays: 4, weightDays: 2, runKm: 8.3, longestStreak: 3, exerciseKcal: 940 });
  });
});

describe("앞으로 할 루틴(읽기 전용)", () => {
  it("커스텀 루틴은 저장한 블록 이름, 쉬는 날은 휴식", () => {
    const customWeek = [["chest", "arm"], ["rest"], ["lower"], ["rest"], ["back"], ["rest"], ["rest"]] as const;
    const cycle = {
      startDate: "2026-09-28",
      variantId: "custom",
      customWeek: customWeek.map((x) => [...x]) as never,
      week: resolveRoutine(0, "custom", customWeek.map((x) => [...x]) as never).variant.week,
    };
    expect(plannedLabel(cycle, "2026-09-28")).toEqual({ label: "가슴 · 팔", rest: false });
    expect(plannedLabel(cycle, "2026-09-29")).toEqual({ label: "휴식", rest: true });
    expect(plannedLabel(cycle, "2026-09-30").label).toBe("하체");
    // 7일 주기
    expect(plannedLabel(cycle, "2026-10-05").label).toBe("가슴 · 팔");
  });
});

describe("화면 가드 — 3단계", () => {
  const page = readFileSync("src/app/calendar/page.tsx", "utf8");
  const history = readFileSync("src/app/settings/history/page.tsx", "utf8");
  const route = readFileSync("src/app/api/calendar/month-image/route.tsx", "utf8");

  it("연속 운동 일수·농도·예정 루틴·공유 버튼이 달려 있다", () => {
    expect(page).toContain('data-testid="calendar-streak"');
    expect(page).toContain("data-level={level}");
    expect(page).toContain('data-testid="planned"');
    expect(page).toContain("<ShareMonthImage");
  });

  it("🔴 원칙 2 — 캘린더는 루틴을 바꾸지 않는다(예정은 읽기만)", () => {
    expect(page).not.toMatch(/from\("routine_exercises"\)|from\("user_routines"\)|Action\(/);
    expect(page).toContain("date > today ? plannedLabel(cycle, date)");
  });

  it("두 달력은 서로 연결된다", () => {
    expect(page).toContain("/settings/history?month=");
    expect(history).toContain("/calendar?m=");
  });

  it("공유 이미지는 본인만·캐시 금지·한글 글꼴", () => {
    expect(route).toContain("status: 401");
    expect(route).toContain('"private, no-store"');
    expect(route).toContain("Pretendard-Bold.otf");
    expect(readFileSync("next.config.ts", "utf8")).toContain("Pretendard-Bold.otf");
  });
});
