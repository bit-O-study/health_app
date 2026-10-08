import { describe, expect, it } from "vitest";

import { compareText, sessionReport } from "@/features/lite/session-report";
import { stimulusFor } from "@/features/routine/exercise-stimulus";
import { subMuscleWeightsForExercise } from "@/features/routine/muscle-detail";
import type { ProgressRecord } from "@/features/routine/progress";

const stimOf = (id: string) => stimulusFor(id, subMuscleWeightsForExercise(id).map((w) => ({ id: w.sub.id, weight: w.weight })));
const rec = (forDate: string, exerciseId: string, weightKg: number, reps: number, sets = 3): ProgressRecord => ({
  forDate, exerciseId, status: "done", sets, reps, weightKg,
});
const TODAY = "2026-10-08"; // 목요일

describe("운동 끝 리포트", () => {
  it("오늘 끝낸 운동이 없으면 null", () => {
    expect(sessionReport([rec("2026-10-07", "bench-press", 60, 10)], TODAY, stimOf)).toBeNull();
  });

  it("오늘 총량 · 지난 같은 부위 날 대비 볼륨 · 종목별 지난번 · 신기록 · 이번 주 며칠째", () => {
    const rows = [
      // 지난 가슴 날(10/2) — 벤치 60×8 4세트 = 1,920kg
      rec("2026-10-02", "bench-press", 60, 8, 4),
      // 그 사이 등 날(10/5) — 같은 부위 날이 아니다
      rec("2026-10-05", "lat-pulldown", 50, 12, 4),
      rec("2026-10-06", "squat", 100, 8, 4),
      // 오늘 가슴 — 벤치 60×10 4세트(같은 무게 +2회, 신기록), 인클라인 처음
      rec(TODAY, "bench-press", 60, 10, 4),
      rec(TODAY, "incline-press", 40, 10, 3),
    ];
    const r = sessionReport(rows, TODAY, stimOf)!;
    expect(r).toMatchObject({ exercises: 2, sets: 7, volumeKg: 2400 + 1200, mainPart: "chest", weekDays: 3 });
    expect(r.lastSamePart).toEqual({ date: "2026-10-02", volumeKg: 1920 });
    expect(r.compares[0]).toMatchObject({ exerciseId: "bench-press", now: { kg: 60, reps: 10 }, prev: { kg: 60, reps: 8 }, prevDate: "2026-10-02", better: true });
    // 종목별 볼륨·예상 최대도 지난번과 나란히: 60×10×4 = 2,400 vs 60×8×4 = 1,920 · 80kg vs 76kg
    expect(r.compares[0]).toMatchObject({ nowVolumeKg: 2400, prevVolumeKg: 1920, nowOneRmKg: 80, prevOneRmKg: 76 });
    expect(r.compares[1]).toMatchObject({ prevVolumeKg: null, prevOneRmKg: null });
    expect(r.compares[1]).toMatchObject({ exerciseId: "incline-press", prev: null, better: false });
    expect(r.prs.map((p) => p.exerciseId)).toEqual(["bench-press"]);
  });

  it("처음 한 종목은 신기록이 아니고, 무게가 줄면 나아진 게 아니다", () => {
    const rows = [rec("2026-10-01", "squat", 100, 8), rec(TODAY, "squat", 90, 8), rec(TODAY, "leg-press", 120, 10)];
    const r = sessionReport(rows, TODAY, stimOf)!;
    expect(r.prs).toEqual([]);
    expect(r.compares.find((c) => c.exerciseId === "squat")!.better).toBe(false);
  });

  it("세트별 기록이면 가장 무거운 세트로 비교", () => {
    const rows: ProgressRecord[] = [
      rec("2026-10-01", "bench-press", 60, 8),
      { forDate: TODAY, exerciseId: "bench-press", status: "done", sets: null, reps: null, weightKg: null, setDetails: [{ weightKg: 60, reps: 10 }, { weightKg: 65, reps: 5 }] },
    ];
    expect(sessionReport(rows, TODAY, stimOf)!.compares[0]).toMatchObject({ now: { kg: 65, reps: 5 }, better: true });
  });

  it("비교 문구", () => {
    const c = (now: [number, number], prev: [number, number] | null) => ({
      exerciseId: "x", now: { kg: now[0], reps: now[1] }, prev: prev && { kg: prev[0], reps: prev[1] }, prevDate: null, better: false,
      nowVolumeKg: 0, prevVolumeKg: null, nowOneRmKg: 0, prevOneRmKg: null,
    });
    expect(compareText(c([60, 10], [60, 8]))).toBe("+2회");
    expect(compareText(c([62.5, 8], [60, 8]))).toBe("+2.5kg");
    expect(compareText(c([55, 8], [60, 8]))).toBe("−5kg");
    expect(compareText(c([60, 6], [60, 8]))).toBe("−2회");
    expect(compareText(c([60, 8], [60, 8]))).toBe("지난번과 같아요");
    expect(compareText(c([60, 8], null))).toBe("처음 기록");
  });
});
