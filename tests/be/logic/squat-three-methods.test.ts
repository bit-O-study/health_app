import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => { throw new Error("Expected reviewed built-in media"); },
}));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("squat demonstrations distinguish movement and equipment", () => {
  it("only selects the new squat video for bodyweight, not barbell or machine", async () => {
    expect(await getExerciseMedia("squat", "bodyweight")).toMatchObject({ equipmentIds: ["bodyweight"], kind: "video" });
    expect(await getExerciseMedia("squat", "barbell")).toBeNull();
    expect(await getExerciseMedia("squat", "machine")).toBeNull();
  });
  it("bodyweight squat uses forward arms and whole-foot pressure", () => {
    const text = methodSteps("squat", "bodyweight").join(" ");
    expect(text).toContain("팔을 앞으로");
    expect(text).toContain("발 전체");
    expect(methodSteps("squat", "barbell").join(" ")).toContain("승모근");
    expect(guideFor("squat").setup).toContain("맨몸");
  });
  it("pulse squat stays in the lower range between pulses", () => {
    const text = methodSteps("pulse-squat", "bodyweight").join(" ");
    expect(text).toContain("4분의 1");
    expect(text).toContain("완전히 일어서지");
    expect(guideFor("pulse-squat").cues.join(" ")).toContain("펄스");
  });
  it("chair pose holds with overhead arms rather than repeated squats", () => {
    const text = methodSteps("chair-pose", "bodyweight").join(" ");
    expect(text).toContain("머리 위");
    expect(text).toContain("자세를 유지");
    expect(guideFor("chair-pose").cues.join(" ")).toContain("호흡");
  });
});
