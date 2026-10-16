import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { methodSteps } from "@/features/routine/exercise-methods";
import { exerciseSummary, guideFor } from "@/features/workout-timer/exercise-guides";

describe("step calf raise guidance", () => {
  it("describes forefoot support on a step and controlled heel movement", () => {
    const text = methodSteps("step-calf-raise", "bodyweight").join(" ");
    expect(text).toContain("발판 가장자리");
    expect(text).toContain("앞꿈치");
    expect(text).toContain("발판 아래로");
    expect(text).toContain("뒤꿈치를 들어");
    expect(text).not.toMatch(/고관절과 무릎을 동시에 굽혀|발 전체로 밀며/);
    expect(methodSteps("step-calf-raise", "dumbbell")).toEqual([]);
  });

  it("uses step-specific guidance and calf targets instead of squat fallback", () => {
    const guide = guideFor("step-calf-raise");
    expect(guide.setup).toContain("발판 가장자리");
    expect(guide.cues.join(" ")).toContain("발판 아래로");
    expect(exerciseSummary("step-calf-raise").oneLiner).toContain("종아리");
    expect(guide.targets.map((target) => target.name).join(" ")).toContain("종아리");
  });
});
