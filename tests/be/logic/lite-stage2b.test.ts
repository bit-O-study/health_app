import { describe, expect, it } from "vitest";

import { pairPainSwaps, swapCandidates } from "@/features/lite/pain-swap";
import { levelFor, mondayOf, yearReview, YEAR_WEEKS } from "@/features/lite/year-review";

describe("아픈 부위 대체(라이트 2단계 5)", () => {
  const rows = [
    { rowId: "r1", exerciseId: "ohp", focus: "shoulder", part: "shoulder" as const },
    { rowId: "r2", exerciseId: "lateral-raise", focus: "shoulder", part: "shoulder" as const },
  ];

  it("🔴 아픈 운동마다 다른 후보를 하나씩 — 같은 후보를 두 번 쓰지 않는다", () => {
    const pairs = pairPainSwaps(rows, [
      { exerciseId: "leg-curl", equipment: "machine" },
      { exerciseId: "lat-pulldown", equipment: "cable" },
    ]);
    expect(pairs.map((p) => [p.from.rowId, p.to.exerciseId])).toEqual([
      ["r1", "leg-curl"],
      ["r2", "lat-pulldown"],
    ]);
  });

  it("후보가 모자라면 남은 아픈 운동은 그대로 둔다", () => {
    expect(pairPainSwaps(rows, [{ exerciseId: "leg-curl", equipment: "machine" }])).toHaveLength(1);
    expect(pairPainSwaps(rows, [])).toEqual([]);
  });

  it("기구 값이 이상한 후보는 거른다", () => {
    expect(swapCandidates([{ exerciseId: "a", equipment: "machine" }, { exerciseId: "b", equipment: "rocket" }])).toEqual([
      { exerciseId: "a", equipment: "machine" },
    ]);
  });
});

describe("1년 돌아보기(라이트 2단계 4)", () => {
  it("월요일 기준 주", () => {
    expect(mondayOf("2026-10-04")).toBe("2026-09-28"); // 일 → 그 주 월
    expect(mondayOf("2026-09-28")).toBe("2026-09-28");
  });

  it("칸 진하기 — 안 한 날 0, 볼륨 사분위로 1~4, 볼륨 0이어도 운동했으면 1", () => {
    const sorted = [100, 200, 300, 400];
    expect(levelFor(-1, sorted)).toBe(0);
    expect(levelFor(0, sorted)).toBe(1);
    expect(levelFor(150, sorted)).toBe(1);
    expect(levelFor(200, sorted)).toBe(2);
    expect(levelFor(300, sorted)).toBe(3);
    expect(levelFor(400, sorted)).toBe(4);
  });

  it("🔴 53주 × 7칸, 오늘 뒤는 비우고 숫자를 낸다", () => {
    const today = "2026-10-01"; // 목
    const vol = new Map([
      ["2026-09-29", 1000],
      ["2026-09-22", 2000],
      ["2026-09-15", 0], // 맨몸 운동만 한 날
      ["2025-01-01", 9999], // 범위 밖
    ]);
    const exDays = new Map([
      ["squat", 3],
      ["bench-press", 2],
    ]);
    const r = yearReview(vol, exDays, [
      { date: "2026-09-29", exerciseId: "squat", oneRmKg: 100, gainKg: 5 },
      { date: "2026-09-22", exerciseId: "bench-press", oneRmKg: 80, gainKg: 2.5 },
    ], today);
    expect(r.weeks).toHaveLength(YEAR_WEEKS);
    expect(r.weeks.every((c) => c.length === 7)).toBe(true);
    expect(r.to).toBe(today);
    expect(r.days).toBe(3);
    expect(r.volumeKg).toBe(3000);
    expect(r.longestWeekStreak).toBe(3);
    expect(r.topExercise).toEqual({ exerciseId: "squat", days: 3 });
    expect(r.bestPr?.gainKg).toBe(5);
    const last = r.weeks[YEAR_WEEKS - 1];
    expect(last[0].date).toBe("2026-09-28");
    expect(last[1].level).toBe(2); // 9/29 1000kg — 볼륨 둘(1000·2000) 중 아래쪽
    expect(r.weeks[YEAR_WEEKS - 2][1].level).toBe(4); // 9/22 2000kg — 가장 큼
    expect(r.weeks[YEAR_WEEKS - 3][1].level).toBe(1); // 9/15 맨몸만 — 운동은 했다
    expect(last[4].future).toBe(true); // 10/2 금
  });
});
