import { describe, expect, it } from "vitest";

import { lastValuesByExercise, routineKey, sameRoutineDates } from "@/features/routine/same-routine";
import type { ProgressRecord } from "@/features/routine/progress";

const rec = (forDate: string, focus: string, exerciseId: string, weightKg: number): ProgressRecord & { focus: string } => ({
  forDate, focus, exerciseId, status: "done", sets: 4, reps: 8, weightKg,
});

describe("same-routine (같은 루틴 지난 기록)", () => {
  it("부위 묶음 키는 순서·중복 무시", () => {
    expect(routineKey(["chest", "arm", "chest"])).toBe(routineKey(["arm", "chest"]));
    expect(routineKey([null, undefined])).toBe("");
  });

  it("오늘과 부위 묶음이 같은 지난 날만 — 가슴만 한 날·가슴+등 날·오늘은 제외", () => {
    const records = [
      rec("2026-10-21", "chest", "bench-press", 60), rec("2026-10-21", "arm", "barbell-curl", 20), // 가슴+팔
      rec("2026-10-24", "chest", "bench-press", 70), // 가슴만
      rec("2026-10-25", "chest", "bench-press", 65), rec("2026-10-25", "back", "lat-pulldown", 50), // 가슴+등
      rec("2026-10-28", "chest", "bench-press", 62), rec("2026-10-28", "arm", "barbell-curl", 22), // 오늘
    ];
    expect([...sameRoutineDates(records, ["arm", "chest"], "2026-10-28")]).toEqual(["2026-10-21"]);
    expect(sameRoutineDates(records, [], "2026-10-28").size).toBe(0);
  });

  it("같은 루틴 날의 값이 더 최근 다른 루틴 값보다 먼저(호출자가 두 맵을 차례로 본다)", () => {
    const records = [rec("2026-10-24", "chest", "bench-press", 70), rec("2026-10-21", "chest", "bench-press", 60)];
    expect(lastValuesByExercise(records, new Set(["2026-10-21"])).get("bench-press")?.weightKg).toBe(60);
    expect(lastValuesByExercise(records).get("bench-press")?.weightKg).toBe(70);
  });

  it("같은 루틴 날이 여러 번이면 가장 최근", () => {
    const records = [rec("2026-10-07", "chest", "bench-press", 55), rec("2026-10-21", "chest", "bench-press", 60)];
    expect(lastValuesByExercise(records, new Set(["2026-10-07", "2026-10-21"])).get("bench-press")?.weightKg).toBe(60);
  });
});
