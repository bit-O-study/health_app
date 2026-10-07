import { describe, expect, it } from "vitest";

import { EMPTY_PLEDGE_DAY, addDays, evaluatePledge, type PledgeDay } from "@/features/commitments/evaluation";
import type { PledgeSpec } from "@/features/commitments/pledge";
import {
  bodyTrend,
  compareItems,
  compareWithLastBlock,
  compareWithLastMonth,
  monthlyTable,
  shortLabel,
  weeklyTable,
} from "@/features/commitments/pledge-trend";

// 다짐 주별·월별 변화(2026-10-07) — 주별 칸 = 판정 구간, 지난주 비교는 같은 일수끼리.

const day = (over: Partial<PledgeDay> = {}): PledgeDay => ({ ...EMPTY_PLEDGE_DAY, strengthParts: [], ...over });
const spec: PledgeSpec = { days: 28, workoutDays: 3, intakeMax: 1900, mealsPerDay: 2 };
const start = "2026-09-21";

/** 1주차: 운동 4일·섭취 1,800. 2주차: 운동 매일 첫 2일만·섭취 2,000. */
function dayOf(d: string): PledgeDay {
  const i = Math.round((Date.parse(d) - Date.parse(start)) / 86_400_000);
  if (i < 0) return day();
  if (i < 7) return day({ workedOut: i < 4, mealCount: 2, intakeKcal: 1800 });
  return day({ workedOut: i < 9, mealCount: 2, intakeKcal: 2000 });
}

describe("주별 표 — 판정 구간 그대로", () => {
  const today = "2026-10-01"; // 2주차 4일째(9/28 시작)
  const ev = evaluatePledge(spec, start, dayOf, today);
  const t = weeklyTable(spec, ev.blocks, today);

  it("칸 = 다짐 구간, 지난 구간은 지킴/못 지킴, 진행 중·앞으로", () => {
    expect(t.cols).toEqual(["1주", "2주", "3주", "4주"]);
    const workout = t.rows.find((r) => r.key === "workout")!;
    expect(workout.label).toBe("운동 주3일");
    expect(workout.cells.map((c) => c.state)).toEqual(["ok", "now", "future", "future"]);
    expect(workout.cells[0].text).toBe("4");
    expect(workout.cells[2].text).toBe("·");
  });

  it("끼니는 '기록한 날/지난 날'", () => {
    const meals = t.rows.find((r) => r.key === "meals")!;
    expect(meals.cells[0].text).toBe("7/7");
    expect(meals.cells[1].text).toBe("4/4");
  });

  it("상한 넘긴 구간은 못 지킴", () => {
    const ev2 = evaluatePledge(spec, start, dayOf, "2026-10-06"); // 2주차 끝남
    const intake = weeklyTable(spec, ev2.blocks, "2026-10-06").rows.find((r) => r.key === "intakeMax")!;
    expect(intake.cells.slice(0, 2).map((c) => c.state)).toEqual(["ok", "no"]);
  });
});

describe("지난주 비교 — 같은 일수끼리", () => {
  it("이번 구간 4일째면 지난 구간도 첫 4일만 센다", () => {
    const today = "2026-10-01";
    const ev = evaluatePledge(spec, start, dayOf, today);
    // 지난 구간 첫 4일 운동 4일 vs 이번 4일 중 2일 → 2일 적다. 섭취 1,800 → 2,000 (상한이라 나쁨).
    const parts = compareWithLastBlock(spec, ev.blocks, dayOf, today)!;
    expect(parts.map((p) => p.text)).toEqual(["운동 2일 적어요", "섭취 200kcal 늘었어요"]);
    expect(parts.map((p) => p.good)).toEqual([false, false]);
  });

  it("첫 구간이면 비교 없음", () => {
    const ev = evaluatePledge(spec, start, dayOf, "2026-09-23");
    expect(compareWithLastBlock(spec, ev.blocks, dayOf, "2026-09-23")).toBeNull();
  });

  it("바뀐 게 없으면 빈 배열(같은 페이스)", () => {
    const item = { key: "workout", reason: "workout_short" as const, label: "", have: 2, need: 3, unit: "일", dir: "atleast" as const, ok: false };
    expect(compareItems([item], [item])).toEqual([]);
  });

  it("상한 항목은 줄어야 좋다", () => {
    const a = { key: "intakeMax", reason: "intake_over" as const, label: "", have: 2000, need: 1900, unit: "kcal", dir: "atmost" as const, ok: false };
    expect(compareItems([a], [{ ...a, have: 1860 }])).toEqual([{ text: "섭취 140kcal 줄었어요", good: true }]);
  });
});

describe("월별 표 — 30일 넘는 다짐만", () => {
  const long: PledgeSpec = { days: 60, workoutDays: 3 };
  const s = "2026-09-10";
  const every = (d: string) => day({ workedOut: Number(d.slice(8)) % 2 === 0 });

  it("30일 이하면 없음", () => {
    const ev = evaluatePledge(spec, start, dayOf, "2026-10-01");
    expect(monthlyTable(spec, start, addDays(start, 27), ev.blocks, dayOf, "2026-10-01")).toBeNull();
  });

  it("달력 월 칸, 값은 그 달 다짐 기간 합계, 지난달 비교는 같은 날짜까지", () => {
    const today = "2026-10-05";
    const ev = evaluatePledge(long, s, every, today);
    const t = monthlyTable(long, s, addDays(s, 59), ev.blocks, every, today)!;
    expect(t.cols).toEqual(["9월", "10월", "11월"]);
    const w = t.rows[0];
    // 9/10~9/30 짝수일 = 10,12,…,30 → 11일. 10/1~10/5 짝수 = 2,4 → 2일.
    expect(w.cells.map((c) => c.text)).toEqual(["11", "2", "·"]);
    expect(w.cells[1].state).toBe("now");
    expect(w.cells[2].state).toBe("future");
    // 9/1~9/5 는 다짐 전이라 지난달 비교 일수가 0 → 비교 없음.
    expect(compareWithLastMonth(long, s, every, today)).toBeNull();
    // 10/12 이면 9/10~9/12(3일) vs 10/10~10/12… 일수가 달라(9월은 3일, 10월은 12일) 비교 안 함.
    expect(compareWithLastMonth(long, s, every, "2026-10-12")).toBeNull();
  });

  it("두 달 모두 같은 일수면 비교한다", () => {
    const s2 = "2026-08-01";
    const l2: PledgeSpec = { days: 90, workoutDays: 3 };
    const parts = compareWithLastMonth(l2, s2, (d) => day({ workedOut: d.slice(5, 7) === "09" }), "2026-09-04");
    expect(parts).toEqual([{ text: "운동 4일 많아요", good: true }]);
  });
});

describe("몸 변화 — 실제 vs 예상", () => {
  const ev = evaluatePledge(spec, start, dayOf, "2026-10-01");
  const base = { startDate: start, days: 28, blocks: ev.blocks, monthlyCols: null, today: "2026-10-01" };

  it("체중: 구간 평균, 기록 없는 칸은 비움, 예상은 지난 비율만큼", () => {
    const b = bodyTrend({
      ...base,
      baseline: { weightKg: 78, muscleKg: 31 },
      predicted: { weightKg: -2, muscleKg: 0 },
      weights: [
        { date: "2026-09-21", kg: 78 },
        { date: "2026-09-25", kg: 77.6 },
        { date: "2026-09-30", kg: 77.2 },
      ],
      muscles: [],
    })!;
    expect(b.metric).toBe("weight");
    expect(b.weekly.map((p) => p.actual)).toEqual([77.8, 77.2, null, null]);
    expect(b.weekly.map((p) => p.predicted)).toEqual([77.5, 77, 76.5, 76]);
    // 10일째 예상 −0.71 vs 실제 −0.8 → 차이 0.3 이내 = 예상대로.
    expect(b.summary).toEqual({ change: -0.8, verdict: "on" });
  });

  it("근육 늘리기 다짐은 골격근, 예상보다 느리면 behind", () => {
    const b = bodyTrend({
      ...base,
      baseline: { weightKg: 70, muscleKg: 30 },
      predicted: { weightKg: 0.5, muscleKg: 2 },
      weights: [],
      muscles: [{ date: "2026-09-30", kg: 30 }],
    })!;
    expect(b.metric).toBe("muscle");
    expect(b.summary?.verdict).toBe("behind");
  });

  it("시작값도 기록도 없으면 없음", () => {
    expect(bodyTrend({ ...base, baseline: { weightKg: null, muscleKg: null }, predicted: null, weights: [], muscles: [] })).toBeNull();
  });
});

describe("줄 이름", () => {
  it("목표 수치까지 짧게", () => {
    expect(shortLabel("workout", { days: 30, workoutDays: 4, burnKcal: 500 })).toBe("소모 500+ 주4일");
    expect(shortLabel("strength:lower", { days: 30, strength: [{ part: "lower", perWeek: 1 }] })).toBe("하체 주1회");
    expect(shortLabel("intakeMin", { days: 30, intakeMin: 2600 })).toBe("섭취 ≥2,600");
  });
});
