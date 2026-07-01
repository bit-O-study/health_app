import { describe, expect, it } from "vitest";

import {
  EXERCISES,
  ALL_EXERCISES,
  getCatalogExercise,
  primaryBodyPart,
  loadClassOf,
} from "@/features/routine/exercise-catalog";
import {
  EXTRA_EXERCISES,
  EXTRA_BODY_PART,
  EXTRA_LOAD_CLASS,
} from "@/features/routine/exercise-catalog-extra";

describe("확장 운동 카탈로그(1,300 CSV) 연결", () => {
  it("확장 세트가 1,000개 이상", () => {
    expect(Object.keys(EXTRA_EXERCISES).length).toBeGreaterThan(1000);
  });

  it("기존 id 와 확장 id 가 겹치지 않음", () => {
    const baseIds = new Set(Object.keys(EXERCISES));
    const overlap = Object.keys(EXTRA_EXERCISES).filter((id) => baseIds.has(id));
    expect(overlap).toEqual([]);
  });

  it("ALL_EXERCISES = 기존 + 확장", () => {
    expect(ALL_EXERCISES.length).toBe(
      Object.keys(EXERCISES).length + Object.keys(EXTRA_EXERCISES).length,
    );
  });

  it("확장 운동도 getCatalogExercise 로 조회됨", () => {
    const id = Object.keys(EXTRA_EXERCISES)[0];
    expect(getCatalogExercise(id)?.id).toBe(id);
  });

  it("모든 확장 운동에 부위·로드클래스·기구·운동법이 있음", () => {
    for (const id of Object.keys(EXTRA_EXERCISES)) {
      expect(EXTRA_BODY_PART[id]).toBeTruthy();
      expect(EXTRA_LOAD_CLASS[id]).toBeTruthy();
      const ex = EXTRA_EXERCISES[id];
      expect(ex.equipments.length).toBeGreaterThan(0);
      expect(ex.equipments[0].method.length).toBeGreaterThan(0);
      // 접근자가 확장분도 해석
      expect(primaryBodyPart(id)).toBe(EXTRA_BODY_PART[id]);
      expect(loadClassOf(id)).toBe(EXTRA_LOAD_CLASS[id]);
    }
  });
});
