import { describe, expect, it } from "vitest";

import {
  matchCatalogExercise,
  normalizeExerciseName,
} from "@/features/equipment/catalog-match";
import { ALL_EXERCISES } from "@/features/routine/exercise-catalog";

describe("normalizeExerciseName", () => {
  it("strips spaces, dashes, case", () => {
    expect(normalizeExerciseName("벤치 프레스")).toBe(
      normalizeExerciseName("벤치프레스"),
    );
    expect(normalizeExerciseName("Bench-Press")).toBe("benchpress");
  });
});

describe("matchCatalogExercise", () => {
  it("matches an exact catalog name to its slug", () => {
    const first = ALL_EXERCISES[0];
    const m = matchCatalogExercise(first.name);
    expect(m?.slug).toBe(first.id);
  });

  it("matches despite spacing differences", () => {
    // "벤치프레스" 는 카탈로그에 존재. 공백 넣어도 매칭돼야 한다.
    const m = matchCatalogExercise("벤치 프레스");
    expect(m?.slug).toBe("bench-press");
  });

  it("matches a close superstring within length tolerance", () => {
    // 모델이 "벤치프레스 머신" 처럼 접미어를 붙여도 근접 매칭.
    const m = matchCatalogExercise("벤치프레스 머신");
    expect(m?.slug).toBe("bench-press");
  });

  it("returns null for unknown equipment-only names", () => {
    expect(matchCatalogExercise("우주선 조종")).toBeNull();
  });

  it("returns null for too-short input", () => {
    expect(matchCatalogExercise("가")).toBeNull();
  });
});
