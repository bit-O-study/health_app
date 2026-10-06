import { describe, expect, it } from "vitest";
import { conditionSets } from "@/features/workout-timer/condition-volume";
import { EXERCISES, primaryBodyPart } from "@/features/routine/exercise-catalog";
import { loadClassOf } from "@/features/routine/exercise-load";
describe("운동모드 컨디션", () => {
  it("계획 기준 감량/유지/증량", () => { expect(conditionSets(4,0,"light")).toBe(3); expect(conditionSets(4,0,"normal")).toBe(4); expect(conditionSets(4,0,"good")).toBe(5); });
  it("완료한 세트는 지우지 않고 진행 중 세트도 남긴다", () => expect(conditionSets(4,3,"light")).toBe(4));
  it("최소 1개, 상한 20개", () => { expect(conditionSets(1,0,"light")).toBe(1); expect(conditionSets(20,0,"good")).toBe(20); });
  it("계획 값에 누적 적용하지 않는다", () => { const plan={sets:4}; for(let i=0;i<3;i++) expect(conditionSets(plan.sets,0,"light")).toBe(3); expect(plan.sets).toBe(4); });
  it("월엔젤은 맨몸 등 운동으로 검색/선택 가능", () => { expect(EXERCISES["wall-angel"].name).toContain("월엔젤"); expect(primaryBodyPart("wall-angel")).toBe("back"); expect(loadClassOf("wall-angel")).toBe("bodyweight"); expect(EXERCISES["wall-angel"].equipments[0].method).toHaveLength(3); });
});
