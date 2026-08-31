import { describe, expect, it } from "vitest";

import {
  isMuscleId,
  MUSCLE_GROUPS,
  MUSCLE_ORDER,
  muscleGroup,
  musclesForExercise,
} from "@/features/routine/muscle-map";
// 부위별 운동 목록은 별도 모듈 — muscle-map 은 목록 데이터를 안 물고 있어야 한다.
import {
  exerciseCountForMuscle,
  exercisesForMuscle,
} from "@/features/routine/muscle-exercises";
import {
  ALL_EXERCISES,
  ALL_FOCUSES,
  exercisesForFocus,
  groupedByBodyPart,
} from "@/features/routine/exercise-catalog";

describe("muscle-map (근육별 운동선택 매핑)", () => {
  it("6개 부위 모두 정의되어 있고 순서와 일치", () => {
    expect(MUSCLE_GROUPS).toHaveLength(6);
    expect(MUSCLE_ORDER).toEqual([
      "chest",
      "back",
      "shoulder",
      "arm",
      "lower",
      "core",
    ]);
    expect(MUSCLE_GROUPS.map((m) => m.id)).toEqual(MUSCLE_ORDER);
  });

  it("모든 부위의 focus 가 유효한 FocusKey (저장 시 saveManualPlanAction 가 거부 안 함)", () => {
    for (const g of MUSCLE_GROUPS) {
      expect(ALL_FOCUSES).toContain(g.focus);
      // atomic 부위는 id 와 focus 가 동일
      expect(g.focus).toBe(g.id);
    }
  });

  it("각 부위 색상은 #rrggbb hex (three.js 머티리얼용)", () => {
    for (const g of MUSCLE_GROUPS) {
      expect(g.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("부위별 운동 목록이 카탈로그 그룹핑과 동일", () => {
    const grouped = groupedByBodyPart();
    for (const g of MUSCLE_GROUPS) {
      expect(exercisesForMuscle(g.id)).toEqual(grouped[g.id]);
      expect(exerciseCountForMuscle(g.id)).toBe(grouped[g.id].length);
    }
  });

  it("모든 부위가 최소 1개 이상의 운동을 가진다 (빈 패널 방지)", () => {
    for (const g of MUSCLE_GROUPS) {
      expect(exerciseCountForMuscle(g.id)).toBeGreaterThan(0);
    }
  });

  it("카탈로그의 모든 운동이 정확히 한 부위에 1차 매핑되어 합계가 전체와 일치", () => {
    const total = MUSCLE_ORDER.reduce(
      (sum, id) => sum + exerciseCountForMuscle(id),
      0,
    );
    expect(total).toBe(ALL_EXERCISES.length);
  });

  it("musclesForExercise: 운동 → 부위가 비어있지 않고 모두 유효 부위", () => {
    for (const ex of ALL_EXERCISES) {
      const parts = musclesForExercise(ex.id);
      expect(parts.length).toBeGreaterThan(0);
      for (const p of parts) expect(isMuscleId(p)).toBe(true);
    }
  });

  it("musclesForExercise 는 그 운동이 속한 1차 부위를 포함한다 (왕복 일관성)", () => {
    const grouped = groupedByBodyPart();
    for (const id of MUSCLE_ORDER) {
      for (const ex of grouped[id]) {
        expect(musclesForExercise(ex.id)).toContain(id);
      }
    }
  });

  it("추천 운동(exercisesForFocus)도 해당 부위 클릭 결과 안에 들어있다", () => {
    for (const g of MUSCLE_GROUPS) {
      const ids = new Set(exercisesForMuscle(g.id).map((e) => e.id));
      for (const rec of exercisesForFocus(g.focus, "male")) {
        // 추천 목록의 운동은 그 부위(또는 보조부위)에서 도달 가능해야 함
        expect(musclesForExercise(rec.id)).toContain(g.id);
        expect(ids.has(rec.id)).toBe(true);
      }
    }
  });

  it("isMuscleId 가드", () => {
    expect(isMuscleId("chest")).toBe(true);
    expect(isMuscleId("lower")).toBe(true);
    expect(isMuscleId("push")).toBe(false); // 세션 그룹은 atomic 부위 아님
    expect(isMuscleId("rest")).toBe(false);
    expect(isMuscleId(null)).toBe(false);
    expect(isMuscleId(123)).toBe(false);
  });

  it("muscleGroup 으로 id→정의 조회", () => {
    expect(muscleGroup("arm").label).toBe("팔");
    expect(muscleGroup("lower").focus).toBe("lower");
  });
});