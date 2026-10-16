import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { methodSteps } from "@/features/routine/exercise-methods";
import { exerciseSummary, guideFor } from "@/features/workout-timer/exercise-guides";

describe("single-leg dumbbell calf raise guidance", () => {
  it("keeps the dumbbell on the working side and describes a supported single-leg heel raise", () => {
    const text = methodSteps("single-leg-calf-raise", "dumbbell").join(" ");
    expect(text).toContain("같은 쪽 손");
    expect(text).toContain("반대손");
    expect(text).toContain("발판 가장자리");
    expect(text).toContain("앞꿈치 접촉");
    expect(text).toContain("발판 아래로");
    expect(text).toContain("뒤꿈치를 들어");
    expect(text).toContain("반대쪽도");
    expect(text).not.toMatch(/고관절과 무릎을 동시에 굽혀|발 전체로 밀며|뒤꿈치를 바닥으로/);
  });
  it("shows calf-specific step guidance without a squat fallback", () => {
    const guide = guideFor("single-leg-calf-raise");
    expect(guide.setup).toContain("한 발");
    expect(guide.setup).toContain("덤벨");
    expect(guide.setup).toContain("발판 가장자리");
    expect(guide.cues.join(" ")).toContain("발판 아래로");
    expect(exerciseSummary("single-leg-calf-raise").oneLiner).toContain("종아리");
  });
});
