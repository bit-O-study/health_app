import { describe, it, expect } from "vitest";
import {
  focusForExercise,
  allExercisesGrouped,
  ALL_FOCUSES,
} from "@/features/routine/exercise-catalog";

describe("focusForExercise — 운동→부위 역인덱스", () => {
  it("카탈로그 운동은 유효한 부위를 돌려준다", () => {
    for (const id of ["squat", "bench-press", "deadlift"]) {
      const f = focusForExercise(id);
      expect(f).not.toBeNull();
      expect(ALL_FOCUSES).toContain(f);
    }
  });
  it("없는 운동은 null", () => {
    expect(focusForExercise("__does-not-exist__")).toBeNull();
    expect(focusForExercise("")).toBeNull();
  });
});

describe("allExercisesGrouped — 전체 운동 둘러보기", () => {
  it("부위별 그룹이 비어있지 않다", () => {
    const groups = allExercisesGrouped();
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(ALL_FOCUSES).toContain(g.focus);
      expect(g.exercises.length).toBeGreaterThan(0);
    }
  });
  it("전체에서 스쿼트·벤치프레스가 존재", () => {
    const ids = new Set(
      allExercisesGrouped().flatMap((g) => g.exercises.map((e) => e.id)),
    );
    expect(ids.has("squat")).toBe(true);
    expect(ids.has("bench-press")).toBe(true);
  });
});
