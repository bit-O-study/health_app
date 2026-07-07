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

  // 합성 focus(fullbody/upper/push/pull) 가 아니라 '기본 부위' 로 태깅돼야 한다.
  // (벤치프레스가 fullbody 로 잡히던 무책임한 태그 회귀 방지.)
  it("대표 부위는 기본 부위 — 벤치=가슴, 스쿼트=하체, 로우=등, OHP=어깨", () => {
    expect(focusForExercise("bench-press")).toBe("chest");
    expect(focusForExercise("squat")).toBe("lower");
    expect(focusForExercise("barbell-row")).toBe("back");
    expect(focusForExercise("ohp")).toBe("shoulder");
  });
  it("합성 focus 로는 절대 태깅되지 않는다", () => {
    const composites = new Set(["fullbody", "upper", "push", "pull"]);
    for (const id of ["bench-press", "squat", "barbell-row", "ohp", "hip-thrust"]) {
      expect(composites.has(focusForExercise(id) as string)).toBe(false);
    }
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

  it("전체 운동 모두 유효한 부위로 역매핑된다(직접 담기 자동 배정 보장)", () => {
    const ids = [
      ...new Set(allExercisesGrouped().flatMap((g) => g.exercises.map((e) => e.id))),
    ];
    // 오늘만 '직접 담기' 에서 아무 운동이나 골라도 focusForExercise 로 부위가 정해져야
    // 저장(부위별 daily_plan)이 안 빠진다.
    for (const id of ids) {
      const f = focusForExercise(id);
      expect(f, `운동 ${id} 의 부위 역매핑`).not.toBeNull();
      expect(ALL_FOCUSES).toContain(f);
    }
  });
});
