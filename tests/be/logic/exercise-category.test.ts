import { describe, expect, it } from "vitest";

import {
  allExerciseCategories,
  exerciseCategory,
} from "@/features/routine/exercise-category";
import { SUB_MUSCLES } from "@/features/routine/muscle-detail";
import { subBlocksForFocus } from "@/features/routine/plan-blocks";

const VALID_SUB_IDS = new Set(
  Object.values(SUB_MUSCLES).flatMap((list) => list.map((s) => s.id)),
);

/**
 * 카테고리 구조 가드 — **모든 운동이 대분류 1개 + 중분류 1개 이상**을 갖는다.
 * 하나라도 비면 "가슴 상부만" 같은 세부근육 필터에서 그 운동이 통째로 사라지거나
 * (반대로) 아무 필터에나 걸린다. 카탈로그에 운동을 추가할 때 이 테스트가 먼저 깨진다.
 */
describe("운동 카테고리(대분류→중분류) 커버리지", () => {
  const all = allExerciseCategories();

  it("카탈로그가 비어 있지 않다", () => {
    expect(all.size).toBeGreaterThan(500);
  });

  it("모든 운동에 중분류가 최소 1개 있다", () => {
    const missing: string[] = [];
    for (const [id, cat] of all) {
      if (cat.subIds.length === 0) missing.push(id);
    }
    expect(
      missing.slice(0, 20),
      `중분류(세부근육)가 없는 운동 ${missing.length}개 — 세부근육 필터에서 사라진다`,
    ).toEqual([]);
  });

  it("중분류 id 는 모두 실재하고, 자기 대분류에 속한다", () => {
    const bad: string[] = [];
    for (const [id, cat] of all) {
      for (const sub of cat.subIds) {
        if (!VALID_SUB_IDS.has(sub)) bad.push(`${id}:${sub}(없는 id)`);
        else if (!sub.startsWith(`${cat.muscle}-`)) {
          bad.push(`${id}:${sub}(대분류 ${cat.muscle} 와 불일치)`);
        }
      }
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it("대표 운동의 분류가 상식과 맞는다", () => {
    expect(exerciseCategory("incline-press")?.muscle).toBe("chest");
    expect(exerciseCategory("incline-press")?.subIds).toContain("chest-upper");
    expect(exerciseCategory("lat-pulldown")?.muscle).toBe("back");
    expect(exerciseCategory("lat-pulldown")?.subIds).toContain("back-lats");
    expect(exerciseCategory("seated-calf-raise")?.subIds).toContain(
      "lower-calves",
    );
  });

  it("카탈로그에 없는 id 는 null", () => {
    expect(exerciseCategory("없는운동")).toBeNull();
  });
});

describe("subBlocksForFocus — 그 부위의 중분류만 추린다", () => {
  it("다른 부위 블록·부위 전체 id 는 걸러진다", () => {
    expect(
      subBlocksForFocus(["chest-upper", "chest-lower", "back-lats", "chest"], "chest"),
    ).toEqual(["chest-upper", "chest-lower"]);
  });

  it("고른 게 없거나 부위 전체만 골랐으면 빈 배열(= 필터 없음)", () => {
    expect(subBlocksForFocus([], "chest")).toEqual([]);
    expect(subBlocksForFocus(["chest"], "chest")).toEqual([]);
    expect(subBlocksForFocus(undefined, "chest")).toEqual([]);
  });

  it("모르는 값은 무시한다", () => {
    expect(subBlocksForFocus(["없는블록", "chest-inner"], "chest")).toEqual([
      "chest-inner",
    ]);
  });
});
