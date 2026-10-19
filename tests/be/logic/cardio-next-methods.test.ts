import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("cardio demonstrations retain the distinguishing movement", () => {
  it("step jack keeps a supporting foot instead of prescribing a jump", () => {
    const text = methodSteps("step-jack", "bodyweight").join(" ");
    expect(text).toContain("점프하지 않고");
    expect(text).toContain("한 발");
    expect(text).toContain("반대쪽");
    expect(guideFor("step-jack").cues.join(" ")).toContain("점프하지 않고");
  });
  it("squat jack includes lateral jumps and a squat, unlike a plain squat", () => {
    const text = methodSteps("squat-jack", "bodyweight").join(" ");
    expect(text).toContain("뛰어 두 발을 벌린");
    expect(text).toContain("스쿼트");
    expect(text).toContain("발을 모은");
    expect(guideFor("squat-jack").setup).toContain("가슴 앞");
  });
  it("high knee skip specifies the rope-free hop rather than ordinary high knees", () => {
    const text = methodSteps("high-knee-skip", "bodyweight").join(" ");
    expect(text).toContain("줄 없이");
    expect(text).toContain("지지발로 가볍게 홉");
    expect(text).toContain("반대쪽 팔");
    expect(guideFor("high-knee-skip").cues.join(" ")).toContain("홉");
  });
});
