import { describe, expect, it } from "vitest";

import {
  daysBetween,
  formatDistance,
  formatMinutes,
  hasWeeklyActivity,
  totalsFor,
  weeklyReport,
  type WeeklyInput,
} from "@/features/routine/weekly-report";
import type { ProgressRecord } from "@/features/routine/progress";

// 2026-08-31(월) ~ 2026-09-06(일) 이 '이번 주'.
const MON = "2026-08-31";
const TUE = "2026-09-01";
const WED = "2026-09-02";
const SUN = "2026-09-06";
// 지난주: 08-24(월) ~ 08-30(일)
const PREV_MON = "2026-08-24";
const PREV_TUE = "2026-08-25";
const PREV_WED = "2026-08-26";
const PREV_SUN = "2026-08-30";

function done(
  forDate: string,
  exerciseId: string,
  sets: number,
  reps: number,
  weightKg: number | null,
): ProgressRecord {
  return {
    forDate,
    exerciseId,
    status: "done",
    sets,
    reps,
    weightKg,
    setDetails: null,
  };
}

function input(over: Partial<WeeklyInput> = {}): WeeklyInput {
  return {
    completions: [],
    workoutSeconds: [],
    runMeters: [],
    steps: [],
    dietLoggedDates: [],
    ...over,
  };
}

describe("daysBetween", () => {
  it("양끝 포함 — 같은 날이면 1", () => {
    expect(daysBetween(MON, MON)).toBe(1);
    expect(daysBetween(MON, SUN)).toBe(7);
  });
  it("달을 넘어도 맞는다", () => {
    expect(daysBetween("2026-08-31", "2026-09-02")).toBe(3);
  });
});

describe("totalsFor — 한 구간 집계", () => {
  it("구간 밖 기록은 안 들어간다", () => {
    const t = totalsFor(
      input({
        completions: [
          done(MON, "squat", 5, 5, 100), // 2500
          done(PREV_SUN, "squat", 5, 5, 100), // 지난주 — 제외
        ],
      }),
      MON,
      MON,
      TUE,
    );
    expect(t.volumeKg).toBe(2500);
    expect(t.exerciseCount).toBe(1);
  });

  it("넘긴(skipped) 기록은 운동한 날로 안 센다", () => {
    const t = totalsFor(
      input({
        completions: [{ ...done(MON, "squat", 5, 5, 100), status: "skipped" }],
      }),
      MON,
      MON,
      TUE,
    );
    expect(t.workoutDays).toBe(0);
    expect(t.exerciseCount).toBe(0);
  });

  it("하루에 여러 운동을 해도 '운동한 날'은 1", () => {
    const t = totalsFor(
      input({
        completions: [
          done(MON, "squat", 5, 5, 100),
          done(MON, "bench-press", 4, 10, 60),
        ],
      }),
      MON,
      MON,
      TUE,
    );
    expect(t.workoutDays).toBe(1);
    expect(t.exerciseCount).toBe(2);
  });

  it("부위 분포는 볼륨 기준·많은 순, 0인 부위는 빠진다", () => {
    const t = totalsFor(
      input({
        completions: [
          done(MON, "squat", 5, 5, 100), // 하체 2500
          done(TUE, "bench-press", 4, 10, 60), // 가슴 2400
        ],
      }),
      MON,
      MON,
      TUE,
    );
    expect(t.bodyParts.map((p) => p.part)).toEqual(["lower", "chest"]);
    expect(t.bodyParts[0].volume).toBe(2500);
    expect(t.bodyParts[0].ratio).toBeCloseTo(2500 / 4900, 3);
    // 안 한 부위는 아예 없다(0% 줄이 다섯 개 뜨면 읽기만 어렵다).
    expect(t.bodyParts.some((p) => p.part === "back")).toBe(false);
  });

  it("맨몸 운동은 볼륨 0이지만 '운동한 날'로는 센다", () => {
    const t = totalsFor(
      input({ completions: [done(MON, "push-up", 3, 20, null)] }),
      MON,
      MON,
      TUE,
    );
    expect(t.volumeKg).toBe(0);
    expect(t.workoutDays).toBe(1);
    expect(t.exerciseCount).toBe(1);
    expect(t.bodyParts).toEqual([]);
  });

  it("운동 시간·러닝·걸음은 구간 안의 날만 더한다", () => {
    const t = totalsFor(
      input({
        workoutSeconds: [
          { forDate: MON, value: 1800 },
          { forDate: PREV_SUN, value: 3600 }, // 구간 밖
        ],
        runMeters: [{ forDate: TUE, value: 3200 }],
        steps: [
          { forDate: MON, value: 8000 },
          { forDate: TUE, value: 6000 },
        ],
      }),
      MON,
      MON,
      TUE,
    );
    expect(t.workoutMinutes).toBe(30);
    expect(t.runMeters).toBe(3200);
    expect(t.steps).toBe(14000);
  });

  it("식단 기록률의 분모는 '지난 날' — 화요일에 2/2 는 100%", () => {
    const t = totalsFor(
      input({ dietLoggedDates: [MON, TUE] }),
      MON,
      MON,
      TUE,
    );
    expect(t.days).toBe(2);
    expect(t.dietLoggedDays).toBe(2);
    expect(t.dietRate).toBe(1);
  });

  it("같은 날 식단을 여러 번 적어도 하루로 센다", () => {
    const t = totalsFor(
      input({ dietLoggedDates: [MON, MON, MON] }),
      MON,
      MON,
      TUE,
    );
    expect(t.dietLoggedDays).toBe(1);
    expect(t.dietRate).toBe(0.5);
  });
});

describe("weeklyReport — 지난주 비교", () => {
  it("진행 중인 주는 지난주도 같은 요일까지만 견준다", () => {
    // 이번 주 화요일. 지난주는 월·화만 들어가야 한다(수요일 기록은 제외).
    const r = weeklyReport(
      input({
        completions: [
          done(MON, "squat", 5, 5, 100),
          done(PREV_MON, "squat", 5, 5, 100),
          done(PREV_TUE, "squat", 5, 5, 100),
          done(PREV_WED, "squat", 5, 5, 100), // 같은 요일 이후 — 제외
        ],
      }),
      TUE,
    );
    expect(r.partial).toBe(true);
    expect(r.current.days).toBe(2);
    expect(r.previous.days).toBe(2);
    expect(r.current.exerciseCount).toBe(1);
    expect(r.previous.exerciseCount).toBe(2);
  });

  it("주가 끝나면 양쪽 다 7일 — 자연히 전체 비교", () => {
    const r = weeklyReport(input(), SUN);
    expect(r.partial).toBe(false);
    expect(r.current.days).toBe(7);
    expect(r.previous.days).toBe(7);
    expect(r.current.weekStart).toBe(MON);
    expect(r.previous.weekStart).toBe(PREV_MON);
  });

  it("지난주가 0이면 변화율은 null — 0에서 늘어난 건 몇 %라고 못 한다", () => {
    const r = weeklyReport(
      input({ completions: [done(MON, "squat", 5, 5, 100)] }),
      TUE,
    );
    expect(r.deltas.volumeKg.diff).toBe(2500);
    expect(r.deltas.volumeKg.pct).toBeNull();
  });

  it("지난주 대비 늘고 준 걸 부호로 준다", () => {
    const r = weeklyReport(
      input({
        steps: [
          { forDate: MON, value: 12000 },
          { forDate: PREV_MON, value: 10000 },
        ],
        runMeters: [{ forDate: PREV_MON, value: 5000 }],
      }),
      MON,
    );
    expect(r.deltas.steps).toEqual({ diff: 2000, pct: 20 });
    expect(r.deltas.runMeters).toEqual({ diff: -5000, pct: -100 });
  });

  it("식단 기록률 변화는 퍼센트 포인트로 준다", () => {
    // 이번 주 월·화 2일 중 2일 기록(100%), 지난주 같은 구간 1일 기록(50%).
    const r = weeklyReport(
      input({ dietLoggedDates: [MON, TUE, PREV_MON] }),
      TUE,
    );
    expect(r.current.dietRate).toBe(1);
    expect(r.previous.dietRate).toBe(0.5);
    expect(r.deltas.dietRate.diff).toBe(50);
  });
});

describe("누락·부분 기록", () => {
  it("아무 기록이 없어도 터지지 않고 전부 0", () => {
    const r = weeklyReport(input(), TUE);
    expect(r.current.volumeKg).toBe(0);
    expect(r.current.workoutDays).toBe(0);
    expect(r.current.dietRate).toBe(0);
    expect(r.deltas.volumeKg).toEqual({ diff: 0, pct: null });
    expect(hasWeeklyActivity(r.current)).toBe(false);
  });

  it("일부만 있어도 있는 것만 센다 — 없는 축이 다른 축을 가리지 않는다", () => {
    const r = weeklyReport(input({ steps: [{ forDate: MON, value: 9000 }] }), TUE);
    expect(hasWeeklyActivity(r.current)).toBe(true);
    expect(r.current.steps).toBe(9000);
    expect(r.current.exerciseCount).toBe(0);
  });

  it("카탈로그에 없는 운동 id 도 개수·날짜로는 센다", () => {
    const t = totalsFor(
      input({ completions: [done(MON, "옛날에-지운-운동", 3, 10, 40)] }),
      MON,
      MON,
      TUE,
    );
    expect(t.exerciseCount).toBe(1);
    expect(t.volumeKg).toBe(1200);
  });
});

describe("표기", () => {
  it("거리는 1km 를 기준으로 단위가 바뀐다", () => {
    expect(formatDistance(0)).toBe("0m");
    expect(formatDistance(940)).toBe("940m");
    expect(formatDistance(3200)).toBe("3.2km");
  });

  it("시간은 60분을 기준으로", () => {
    expect(formatMinutes(45)).toBe("45분");
    expect(formatMinutes(60)).toBe("1시간");
    expect(formatMinutes(95)).toBe("1시간 35분");
  });
});
