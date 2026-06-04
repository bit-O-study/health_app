import { describe, expect, it } from "vitest";

import {
  ALL_SUB_MUSCLES,
  EXERCISE_SUB_MUSCLES,
  exerciseIdsForSubMuscle,
  isSubMuscleId,
  SUB_MUSCLES,
  subMuscle,
  subMusclesFor,
  subMusclesForExercise,
} from "@/features/routine/muscle-detail";
import {
  ALL_EXERCISES,
  getCatalogExercise,
} from "@/features/routine/exercise-catalog";
import { MUSCLE_ORDER } from "@/features/routine/muscle-map";

describe("muscle-detail (세부 근육 세분화)", () => {
  it("6개 부위 모두 세부 근육을 가진다", () => {
    for (const m of MUSCLE_ORDER) {
      expect(subMusclesFor(m).length).toBeGreaterThan(0);
    }
  });

  it("세부 근육 id 는 전역 유일하고 부위 prefix 를 가진다", () => {
    const ids = ALL_SUB_MUSCLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of ALL_SUB_MUSCLES) {
      expect(s.id.startsWith(`${s.muscle}-`)).toBe(true);
      expect(subMuscle(s.id)).toEqual(s);
    }
  });

  it("ALL_SUB_MUSCLES 는 부위별 합과 같다", () => {
    const total = MUSCLE_ORDER.reduce(
      (sum, m) => sum + SUB_MUSCLES[m].length,
      0,
    );
    expect(ALL_SUB_MUSCLES).toHaveLength(total);
  });

  it("운동→세부근육 명시 매핑은 모두 유효한 운동 id + 유효한 세부근육 id", () => {
    for (const [exerciseId, subIds] of Object.entries(EXERCISE_SUB_MUSCLES)) {
      expect(getCatalogExercise(exerciseId)).toBeTruthy();
      expect(subIds.length).toBeGreaterThan(0);
      for (const sid of subIds) expect(isSubMuscleId(sid)).toBe(true);
    }
  });

  it("모든 카탈로그 운동은 세부근육이 1개 이상 (폴백 포함)", () => {
    for (const ex of ALL_EXERCISES) {
      expect(subMusclesForExercise(ex.id).length).toBeGreaterThan(0);
    }
  });

  // 사용자 요구사항: "이두 운동 중 이두 안 어느 근육에 특화됐는지"
  it("이두 운동의 세부 특화가 구분된다 (장두 vs 단두)", () => {
    const ids = (id: string) =>
      subMusclesForExercise(id).map((s) => s.id);
    expect(ids("incline-curl")).toContain("arm-biceps-long"); // 인클라인 = 장두
    expect(ids("drag-curl")).toContain("arm-biceps-long");
    expect(ids("concentration-curl")).toContain("arm-biceps-short"); // 컨센 = 단두
    expect(ids("preacher-curl")).toContain("arm-biceps-short");
    // 장두 특화 운동은 단두만 표기하지 않는다
    expect(ids("incline-curl")).not.toContain("arm-biceps-short");
  });

  it("삼두 운동의 세부 특화가 구분된다 (장두 vs 외측두)", () => {
    const ids = (id: string) => subMusclesForExercise(id).map((s) => s.id);
    expect(ids("skull-crusher")).toContain("arm-triceps-long");
    expect(ids("overhead-triceps-extension")).toContain("arm-triceps-long");
    expect(ids("triceps-kickback")).toContain("arm-triceps-lateral");
  });

  it("가슴 상/하부가 운동별로 구분된다", () => {
    const ids = (id: string) => subMusclesForExercise(id).map((s) => s.id);
    expect(ids("incline-press")).toContain("chest-upper");
    expect(ids("decline-press")).toContain("chest-lower");
    expect(ids("incline-press")).not.toContain("chest-lower");
  });

  it("exerciseIdsForSubMuscle 역방향: 이두 장두 운동 목록", () => {
    const longHead = exerciseIdsForSubMuscle("arm-biceps-long");
    expect(longHead).toContain("incline-curl");
    expect(longHead).toContain("drag-curl");
    expect(longHead).not.toContain("concentration-curl"); // 단두 운동
  });

  it("isSubMuscleId 가드", () => {
    expect(isSubMuscleId("arm-biceps-long")).toBe(true);
    expect(isSubMuscleId("arm")).toBe(false); // 부위는 세부근육 아님
    expect(isSubMuscleId("nope")).toBe(false);
    expect(isSubMuscleId(null)).toBe(false);
  });
});