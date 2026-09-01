import { describe, expect, it } from "vitest";

import {
  exerciseOptionsByIdsAction,
  exercisesForSlotAction,
  exercisesForSlotsAction,
  recommendExercisesAction,
} from "@/features/routine/slot-exercise-actions";

describe("운동 편집기 서버 목록 조회", () => {
  it("잘못된 부위는 빈 목록으로 거절한다", async () => {
    await expect(exercisesForSlotAction("rest")).resolves.toEqual([]);
    await expect(exercisesForSlotAction("CHEST")).resolves.toEqual([]);
  });

  it("부위 전체 조회는 클라이언트용 최소 필드만 반환한다", async () => {
    const rows = await exercisesForSlotAction("chest", [], true);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toEqual({
      id: expect.any(String), name: expect.any(String),
      target: expect.any(String), equipments: expect.any(Array),
    });
    expect(rows[0].equipments.length).toBeGreaterThan(0);
  });

  it("세부근육 블록은 해당 운동 목록으로 좁힌다", async () => {
    const rows = await exercisesForSlotAction("chest", ["chest-upper"]);
    expect(rows.map((row) => row.id)).toContain("incline-press");
    expect(rows.map((row) => row.id)).not.toContain("bench-press");
  });

  it("id 조회는 중복·없는 운동을 제거하고 요청 순서를 지킨다", async () => {
    const rows = await exerciseOptionsByIdsAction([
      "squat", "존재하지-않음", "bench-press", "squat",
    ]);
    expect(rows.map((row) => row.id)).toEqual(["squat", "bench-press"]);
  });

  it("여러 슬롯 조회는 잘못된 슬롯 자리도 빈 목록으로 유지한다", async () => {
    const rows = await exercisesForSlotsAction([
      { key: "valid", focus: "back" },
      { key: "invalid", focus: "rest" },
    ]);
    expect(rows.map((row) => row.key)).toEqual(["valid", "invalid"]);
    expect(rows[0].exercises.length).toBeGreaterThan(0);
    expect(rows[1].exercises).toEqual([]);
  });

  it("추천은 요청 순서와 부위를 유지하고 잘못된 부위는 비운다", async () => {
    const rows = await recommendExercisesAction(
      [{ focus: "lower" }, { focus: "rest" }, { focus: "chest" }], "male",
    );
    expect(rows.map((row) => row.focus)).toEqual(["lower", "rest", "chest"]);
    expect(rows[0].exercises.length).toBeGreaterThan(0);
    expect(rows[1].exercises).toEqual([]);
    expect(rows[2].exercises.length).toBeGreaterThan(0);
  });
});
