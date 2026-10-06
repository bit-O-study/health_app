import { describe, expect, it } from "vitest";

import {
  bodyCompReport,
  conditionReport,
  dietMonthReport,
  signed,
  STEP_GOAL,
  weeklyHabitReport,
} from "@/features/lite/reports";

describe("A1 체성분 변화", () => {
  const rows = [
    { date: "2026-09-01", weightKg: 72, muscleKg: 32, fatKg: 15, fatPct: 20.8 },
    { date: "2026-08-01", weightKg: 73, muscleKg: 31.2, fatKg: 16.5, fatPct: 22.6 },
    { date: "2026-10-01", weightKg: 71.5, muscleKg: 32.6, fatKg: 14.1, fatPct: 19.7 },
  ];

  it("🔴 날짜순으로 정렬해 지난 측정 대비·첫 측정 대비를 낸다", () => {
    const r = bodyCompReport(rows);
    expect(r.count).toBe(3);
    expect(r.firstDate).toBe("2026-08-01");
    expect(r.prevDate).toBe("2026-09-01");
    expect(r.latestDate).toBe("2026-10-01");
    const muscle = r.lines.find((l) => l.key === "muscleKg")!;
    expect(muscle.latest).toBe(32.6);
    expect(muscle.sincePrev).toBe(0.6);
    expect(muscle.sinceFirst).toBe(1.4);
    expect(muscle.series.map((p) => p.date)).toEqual(["2026-08-01", "2026-09-01", "2026-10-01"]);
  });

  it("🔴 근육은 늘면 좋아진 것, 지방·체중은 줄면 좋아진 것", () => {
    const r = bodyCompReport(rows);
    expect(r.lines.find((l) => l.key === "muscleKg")!.better).toBe(true);
    expect(r.lines.find((l) => l.key === "fatKg")!.better).toBe(true);
    expect(r.lines.find((l) => l.key === "fatPct")!.sinceFirst).toBe(-2.9);
  });

  it("측정 1번이면 비교 없이 최신값만, 값이 없는 항목은 뺀다", () => {
    const r = bodyCompReport([{ date: "2026-10-01", weightKg: 70, muscleKg: null, fatKg: null, fatPct: null }]);
    expect(r.lines.map((l) => l.key)).toEqual(["weightKg"]);
    expect(r.lines[0].sincePrev).toBeNull();
    expect(r.lines[0].better).toBeNull();
    expect(bodyCompReport([]).lines).toEqual([]);
  });

  it("부호 표시", () => {
    expect(signed(1.4)).toBe("+1.4");
    expect(signed(-2.9)).toBe("−2.9");
    expect(signed(0)).toBe("0");
  });
});

describe("A2 컨디션", () => {
  it("🔴 최근 28일 칸 · 강도별 개수 · 좋은 날/안 좋은 날 평균 볼륨 · 가장 자주 나쁜 항목", () => {
    const checkins = [
      { date: "2026-10-02", sleep: 3, soreness: 3, energy: 3 } as const, // good
      { date: "2026-10-01", sleep: 1, soreness: 3, energy: 2 } as const, // light (잠 나쁨)
      { date: "2026-09-30", sleep: 1, soreness: 2, energy: 3 } as const, // light
      { date: "2026-09-29", sleep: 2, soreness: 2, energy: 2 } as const, // normal
      { date: "2026-08-01", sleep: 1, soreness: 1, energy: 1 } as const, // 28일 밖
    ];
    const vol = new Map([
      ["2026-10-02", 5000],
      ["2026-10-01", 3000],
      ["2026-09-30", 2000],
    ]);
    const r = conditionReport(checkins, vol, "2026-10-02");
    expect(r.days).toHaveLength(28);
    expect(r.days[27]).toEqual({ date: "2026-10-02", kind: "good" });
    expect(r.days[0].date).toBe("2026-09-05");
    expect(r.checked).toBe(4);
    expect(r.counts).toEqual({ good: 1, normal: 1, light: 2 });
    expect(r.avgVolumeGood).toBe(5000);
    expect(r.avgVolumeLight).toBe(2500);
    expect(r.weakest).toBe("sleep");
  });

  it("체크인이 없으면 빈 칸만, 나쁜 항목도 없음", () => {
    const r = conditionReport([], new Map(), "2026-10-02", 7);
    expect(r.days.every((d) => d.kind === null)).toBe(true);
    expect(r.avgVolumeGood).toBeNull();
    expect(r.weakest).toBeNull();
  });
});

describe("A3 식단 월간", () => {
  const row = (date: string, name: string, kcal: number, p: number) => ({
    date,
    name,
    kcal,
    proteinG: p,
    carbsG: 10,
    fatG: 5,
  });

  it("🔴 기록한 날만 평균 낸다 — 안 적은 날을 0kcal 로 치지 않는다", () => {
    const rows = [
      row("2026-10-01", "닭가슴살", 300, 60),
      row("2026-10-01", "현미밥", 900, 20),
      row("2026-10-02", "닭가슴살", 1500, 70),
      row("2026-09-30", "피자", 3000, 40), // 지난달
    ];
    const r = dietMonthReport(rows, "2026-10", { kcal: 1400, proteinG: 75 }, new Set(["2026-10-01"]));
    expect(r.loggedDays).toBe(2);
    expect(r.avgKcal).toBe(1350);
    expect(r.avgProteinG).toBe(75);
    expect(r.proteinHitDays).toBe(1); // 10-01: 80g
    expect(r.kcalOnTargetDays).toBe(1); // 10-02: 1500 (±140 안), 10-01: 1200 밖
    expect(r.topFoods[0]).toEqual({ name: "닭가슴살", count: 2 });
    expect(r.proteinWorkoutDays).toBe(80);
    expect(r.proteinRestDays).toBe(70);
  });

  it("기록이 없으면 0과 null", () => {
    const r = dietMonthReport([], "2026-10", { kcal: 2000, proteinG: 100 }, new Set());
    expect(r.loggedDays).toBe(0);
    expect(r.avgKcal).toBe(0);
    expect(r.proteinWorkoutDays).toBeNull();
  });
});

describe("A4 수분·걸음 주간", () => {
  it("🔴 최근 7일과 그 전 7일 — 0은 기록 없음, 목표 이상인 날 수", () => {
    const water = new Map([
      ["2026-10-02", 2000],
      ["2026-10-01", 1000],
      ["2026-09-25", 2500], // 지난주
      ["2026-09-30", 0],
    ]);
    const steps = new Map([
      ["2026-10-02", STEP_GOAL + 1],
      ["2026-09-20", 3000], // 지난주
    ]);
    const r = weeklyHabitReport(water, steps, "2026-10-02", 2000);
    expect(r.days).toHaveLength(7);
    expect(r.days[0].date).toBe("2026-09-26");
    expect(r.days[6]).toEqual({ date: "2026-10-02", waterMl: 2000, steps: STEP_GOAL + 1 });
    expect(r.water.thisWeek).toEqual({ avg: 1500, hitDays: 1, days: 2 });
    expect(r.water.lastWeek).toEqual({ avg: 2500, hitDays: 1, days: 1 });
    expect(r.steps.thisWeek.hitDays).toBe(1);
    expect(r.steps.lastWeek.avg).toBe(3000);
  });

  it("STEP_GOAL 은 7,000보", () => {
    expect(STEP_GOAL).toBe(7000);
  });
});
