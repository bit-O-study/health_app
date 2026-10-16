import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { methodSteps } from "@/features/routine/exercise-methods";
import { exerciseSummary, guideFor } from "@/features/workout-timer/exercise-guides";

describe("arm circle directions", () => {
  for (const [id, direction] of [["arm-circle", "앞으로"], ["backward-arm-circle", "뒤로"]]) {
    it(`${id} describes shoulder-height circles in the correct direction`, () => {
      const text = methodSteps(id, "bodyweight").join(" ");
      expect(text).toContain("어깨 높이");
      expect(text).toContain(direction);
      expect(text).toContain("작은 원");
      const guide = guideFor(id);
      expect(guide.setup).toContain("양팔");
      expect(guide.cues.join(" ")).toContain(direction);
      expect(exerciseSummary(id).oneLiner).toContain(direction);
      expect(guide.cues.join(" ")).not.toMatch(/덤벨|바벨|팔꿈치만/);
    });
  }
});
