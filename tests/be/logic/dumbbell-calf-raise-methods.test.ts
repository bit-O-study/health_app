import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor, exerciseSummary } from "@/features/workout-timer/exercise-guides";

describe("dumbbell standing calf raise guidance", () => {
  it("describes heel elevation and controlled lowering rather than a squat", () => {
    const steps = methodSteps("dumbbell-standing-calf-raise", "dumbbell");
    expect(steps.join(" ")).toContain("뒤꿈치를 들어");
    expect(steps.join(" ")).toContain("앞꿈치");
    expect(steps.join(" ")).toContain("천천히 내려");
    expect(steps.join(" ")).not.toMatch(/고관절과 무릎을 동시에 굽혀|발 전체로 밀며/);
    expect(methodSteps("dumbbell-standing-calf-raise", "barbell")).toEqual([]);
  });

  it("provides a calf-specific guide instead of the squat category fallback", () => {
    const guide = guideFor("dumbbell-standing-calf-raise");
    expect(guide.setup).toContain("덤벨");
    expect(guide.targets.map((target) => target.name).join(" ")).toContain("종아리");
    expect(guide.cues.join(" ")).toContain("뒤꿈치");
    expect(exerciseSummary("dumbbell-standing-calf-raise").oneLiner).toContain("종아리");
  });
});
