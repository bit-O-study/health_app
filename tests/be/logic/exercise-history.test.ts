import { describe, expect, it } from "vitest";

import { exerciseIndex, exerciseSessions } from "@/features/lite/exercise-history";
import type { ProgressRecord } from "@/features/routine/progress";

const rec = (forDate: string, exerciseId: string, weightKg: number | null, reps: number, sets = 3): ProgressRecord => ({
  forDate, exerciseId, status: "done", sets, reps, weightKg,
});

describe("종목별 기록 찾기", () => {
  const rows: ProgressRecord[] = [
    rec("2026-09-01", "deadlift", 80, 8),
    rec("2026-09-15", "deadlift", 100, 5),
    rec("2026-10-01", "deadlift", 90, 8),
    rec("2026-10-05", "plank", null, 60),
    { forDate: "2026-10-06", exerciseId: "bench-press", status: "done", sets: null, reps: null, weightKg: null, setDetails: [{ weightKg: 60, reps: 10 }, { weightKg: 65, reps: 6 }] },
    { forDate: "2026-10-06", exerciseId: "bench-press", status: "skipped", sets: 3, reps: 10, weightKg: 100 },
  ];

  it("종목 목록 — 최근에 한 순, 한 날 수 · 최고 무게(무게 없는 종목은 null), 건너뛴 기록은 뺀다", () => {
    expect(exerciseIndex(rows)).toEqual([
      { exerciseId: "bench-press", sessions: 1, lastDate: "2026-10-06", bestKg: 65 },
      { exerciseId: "plank", sessions: 1, lastDate: "2026-10-05", bestKg: null },
      { exerciseId: "deadlift", sessions: 3, lastDate: "2026-10-01", bestKg: 100 },
    ]);
  });

  it("한 종목의 날짜별 기록 — 최근 순, 가장 무거운 세트·세트 그대로·볼륨·그때 최고였는지", () => {
    const s = exerciseSessions(rows, "deadlift");
    expect(s.map((x) => [x.date, x.top, x.detail, x.volumeKg, x.pr])).toEqual([
      ["2026-10-01", { kg: 90, reps: 8 }, "3세트 × 8회 · 90kg", 2160, false],
      ["2026-09-15", { kg: 100, reps: 5 }, "3세트 × 5회 · 100kg", 1500, true],
      // 첫 기록은 신기록이 아니다
      ["2026-09-01", { kg: 80, reps: 8 }, "3세트 × 8회 · 80kg", 1920, false],
    ]);
    expect(exerciseSessions(rows, "bench-press")[0]).toMatchObject({ sets: 2, top: { kg: 65, reps: 6 }, detail: "60×10 · 65×6" });
  });
});
