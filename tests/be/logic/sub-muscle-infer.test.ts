import { describe, expect, it } from "vitest";

import { inferSubMuscleIds } from "@/features/routine/sub-muscle-infer";
import { subMusclesForExercise } from "@/features/routine/muscle-detail";
import { allExercisesForSlot } from "@/features/routine/recommend";
import { allExercisesForFocus } from "@/features/routine/exercise-catalog";

describe("inferSubMuscleIds — 이름/타깃으로 세부근육 추론", () => {
  it("가슴: 인클라인=상부, 디클라인·딥스=하부, 플라이=내측", () => {
    expect(inferSubMuscleIds("chest", "인클라인 덤벨 프레스", "")).toContain(
      "chest-upper",
    );
    expect(inferSubMuscleIds("chest", "디클라인 벤치프레스", "")).toContain(
      "chest-lower",
    );
    expect(inferSubMuscleIds("chest", "케이블 크로스오버", "")).toContain(
      "chest-inner",
    );
  });

  it("가슴: 인클라인 플라이는 상부 + 내측 둘 다", () => {
    const ids = inferSubMuscleIds("chest", "인클라인 덤벨 플라이", "");
    expect(ids).toContain("chest-upper");
    expect(ids).toContain("chest-inner");
  });

  it("단서가 없으면 부위 대표 1개로만 떨어진다(넓게 안 퍼짐)", () => {
    expect(inferSubMuscleIds("chest", "무슨무슨 프레스", "")).toEqual([
      "chest-mid",
    ]);
    expect(inferSubMuscleIds("lower", "이름없는 하체운동", "")).toEqual([
      "lower-quads",
    ]);
  });

  it("등/어깨/하체/코어도 단서대로 좁혀진다", () => {
    expect(inferSubMuscleIds("back", "바벨 슈러그", "")).toContain("back-traps");
    expect(inferSubMuscleIds("back", "컨벤셔널 데드리프트", "")).toContain(
      "back-erector",
    );
    expect(inferSubMuscleIds("shoulder", "케이블 래터럴 레이즈", "")).toContain(
      "shoulder-side",
    );
    expect(inferSubMuscleIds("shoulder", "리어 델트 플라이", "")).toContain(
      "shoulder-rear",
    );
    expect(inferSubMuscleIds("lower", "시티드 카프 레이즈", "")).toContain(
      "lower-calves",
    );
    expect(inferSubMuscleIds("lower", "레그 컬", "")).toContain(
      "lower-hamstrings",
    );
    expect(inferSubMuscleIds("core", "행잉 레그 레이즈", "")).toContain(
      "core-lower-abs",
    );
    expect(inferSubMuscleIds("core", "러시안 트위스트", "")).toContain(
      "core-obliques",
    );
  });

  it("타깃 문구도 함께 본다", () => {
    expect(inferSubMuscleIds("chest", "머신 프레스", "상부 대흉근")).toContain(
      "chest-upper",
    );
  });
});

describe("세부근육 선택 필터가 실제로 좁혀지는지(회귀)", () => {
  // 예전엔 매핑 없는 운동이 부위 기본값(상부+중부+하부)으로 폴백해서
  // "가슴 상부만" 을 골라도 가슴 운동 134개 중 127개가 통과했다(= 필터 무의미).
  it("가슴 상부는 가슴 전체의 절반 미만으로 좁혀진다", () => {
    const all = allExercisesForFocus("chest").length;
    const upper = allExercisesForSlot("chest", ["chest-upper"]).length;
    expect(upper).toBeGreaterThan(0);
    expect(upper).toBeLessThan(all / 2);
  });

  it("가슴 상부+하부를 고르면 둘 중 하나를 타깃하는 운동만 남는다", () => {
    const picked = allExercisesForSlot("chest", ["chest-upper", "chest-lower"]);
    expect(picked.length).toBeGreaterThan(0);
    for (const ex of picked) {
      const subs = subMusclesForExercise(ex.id).map((s) => s.id);
      expect(
        subs.includes("chest-upper") || subs.includes("chest-lower"),
      ).toBe(true);
    }
    // 중부/내측 전용 운동(푸시업·펙덱)은 빠져야 한다.
    const ids = picked.map((e) => e.id);
    expect(ids).not.toContain("push-up");
    expect(ids).not.toContain("pec-deck");
  });

  it("종아리처럼 좁은 세부근육은 하체 전체보다 훨씬 적다", () => {
    const all = allExercisesForFocus("lower").length;
    const calves = allExercisesForSlot("lower", ["lower-calves"]).length;
    expect(calves).toBeGreaterThan(0);
    expect(calves).toBeLessThan(all / 5);
  });
});
