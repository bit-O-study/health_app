import { describe, expect, it } from "vitest";

import { recommendExerciseSubstitutes } from "@/features/routine/exercise-substitutes";
import type { CatalogExercise } from "@/features/routine/exercise-catalog-labels";

const candidates: CatalogExercise[] = [
  {
    id: "current",
    name: "현재 운동",
    target: "가슴",
    equipments: [{ equipment: "barbell" }],
  },
  {
    id: "machine-choice",
    name: "머신 운동",
    target: "가슴",
    equipments: [{ equipment: "machine" }],
  },
  {
    id: "barbell-choice",
    name: "바벨 운동",
    target: "가슴",
    equipments: [{ equipment: "barbell" }],
  },
  {
    id: "unavailable",
    name: "없는 기구 운동",
    target: "가슴",
    equipments: [{ equipment: "cable" }],
  },
];

describe("recommendExerciseSubstitutes", () => {
  it("현재 운동과 없는 기구를 빼고 같은 기구 후보를 우선한다", () => {
    const result = recommendExerciseSubstitutes(
      "current",
      "barbell",
      candidates,
      new Set(["barbell", "machine"]),
    );

    expect(result.map((item) => item.exerciseId)).toEqual([
      "barbell-choice",
      "machine-choice",
    ]);
    expect(result[0]).toMatchObject({ equipment: "barbell" });
    expect(result[0]?.reason).toContain("같은 기구");
    expect(result[1]?.reason).toContain("현재 헬스장");
  });

  it("헬스장 정보가 없으면 가능한 후보를 제한 개수만 추천한다", () => {
    const result = recommendExerciseSubstitutes(
      "current",
      "barbell",
      candidates,
      null,
      1,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.exerciseId).toBe("barbell-choice");
  });
});
