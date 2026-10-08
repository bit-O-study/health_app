import { describe, expect, it } from "vitest";

import { growthRows, monthParts, monthStats, prEvents, prevMonth, sparkPoints } from "@/features/routine/fit-growth";
import { weeklyTargets } from "@/features/routine/body-targets";
import { stimulusFor } from "@/features/routine/exercise-stimulus";
import type { ProgressRecord } from "@/features/routine/progress";

const rec = (forDate: string, exerciseId: string, sets: number, reps: number, weightKg: number): ProgressRecord => ({
  forDate, exerciseId, status: "done", sets, reps, weightKg,
});

const RECS: ProgressRecord[] = [
  rec("2026-09-01", "bench-press", 4, 8, 60),
  rec("2026-09-08", "bench-press", 4, 8, 62.5),
  rec("2026-09-15", "bench-press", 4, 8, 65),
  rec("2026-09-03", "squat", 4, 8, 80),
  rec("2026-09-10", "squat", 4, 8, 80),
  rec("2026-09-17", "squat", 4, 8, 80),
  rec("2026-10-01", "squat", 4, 8, 85),
];

describe("성장", () => {
  it("볼륨 상위 종목의 예상 1RM 추이와 변화율", () => {
    const rows = growthRows(RECS);
    const bench = rows.find((r) => r.exerciseId === "bench-press")!;
    expect(bench.series.map((p) => p.value)).toEqual([76, 79.2, 82.3]);
    expect(bench.trend).toBe(8);
    expect(bench.latestKg).toBe(82.3);
  });

  it("최근 3번 그대로면 정체", () => {
    const rows = growthRows(RECS.filter((r) => r.forDate < "2026-10-01"));
    expect(rows.find((r) => r.exerciseId === "squat")!.stalled).toBe(true);
    expect(rows.find((r) => r.exerciseId === "bench-press")!.stalled).toBe(false);
  });

  it("🔴 신기록은 지난 최고를 0.5kg 이상 넘긴 날 — 첫 기록은 아니다. 최근 것부터", () => {
    const prs = prEvents(RECS);
    expect(prs.map((p) => `${p.date}:${p.exerciseId}`)).toEqual([
      "2026-10-01:squat",
      "2026-09-15:bench-press",
      "2026-09-08:bench-press",
    ]);
    expect(prs[0].gainKg).toBe(6.4); // 80×(1+8/30)=101.3 → 85×(1+8/30)=107.7
  });
});

describe("월간 리포트", () => {
  it("운동한 날·볼륨·신기록 수", () => {
    const prs = prEvents(RECS);
    // 볼륨 = 무게 × 4세트 × 8회: 벤치 (60+62.5+65)×32 = 6,000 + 스쿼트 80×32×3 = 7,680
    expect(monthStats(RECS, "2026-09", prs)).toEqual({ days: 6, volumeKg: 13_680, prs: 2 });
  });

  it("🔴 지난달은 같은 날짜까지만 — 이번 달 8일이면 지난달 1~8일과 비교(2026-10-08)", () => {
    const prs = prEvents(RECS);
    // 9/1 벤치 · 9/3 스쿼트 · 9/8 벤치(신기록) — 9/10 이후는 빠진다.
    expect(monthStats(RECS, "2026-09", prs, { throughDay: 8 })).toEqual({ days: 3, volumeKg: 60 * 32 + 80 * 32 + 62.5 * 32, prs: 1 });
  });

  it("🔴 러닝만 한 날도 운동한 날 — 근력과 같은 날은 하루로", () => {
    const s = monthStats(RECS, "2026-10", [], { throughDay: 8, runDates: ["2026-10-01", "2026-10-05", "2026-10-20", "2026-09-30"] });
    expect(s.days).toBe(2); // 10/1(스쿼트+러닝) · 10/5(러닝만). 10/20 은 기간 밖, 9/30 은 다른 달.
  });

  it("가장 많이 한 부위·가장 모자란 부위(목표 대비)", () => {
    const p = monthParts(RECS, "2026-09", weeklyTargets("male", "intermediate"), 4, (id) => stimulusFor(id));
    expect(p.top).not.toBeNull();
    expect(["back", "core", "arm", "shoulder"]).toContain(p.lacking);
    expect(monthParts([], "2026-09", weeklyTargets("male", null), 4, (id) => stimulusFor(id))).toEqual({ top: null, lacking: null });
  });

  it("이전 달", () => {
    expect(prevMonth("2026-10")).toBe("2026-09");
    expect(prevMonth("2026-01")).toBe("2025-12");
  });
});

describe("스파크라인", () => {
  it("첫 점은 왼쪽 아래, 마지막은 오른쪽 위(오르는 추이)", () => {
    const pts = sparkPoints([{ date: "a", value: 10 }, { date: "b", value: 20 }], 200, 36, 4).split(" ");
    expect(pts[0]).toBe("0,32");
    expect(pts[1]).toBe("200,4");
    expect(sparkPoints([])).toBe("");
  });
});
