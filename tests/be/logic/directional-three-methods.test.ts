import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected reviewed built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("lateral, forward and jumping movement distinctions", () => {
  it("teaches a lateral step with a long trailing leg", () => {
    expect(methodSteps("side-lunge", "dumbbell").join(" ")).toContain("옆으로");
    expect(guideFor("side-lunge").cues.join(" ")).toContain("반대쪽 다리는 길게");
  });
  it("returns the forward stepping foot for the kettlebell lunge", () => {
    const cues = guideFor("kettlebell-lunge").cues.join(" ");
    expect(cues).toContain("앞으로");
    expect(cues).toContain("내디딘 발을 시작 위치로");
  });
  it("includes flight and flexed landing for the jump squat", () => {
    const cues = guideFor("dumbbell-jump-squat").cues.join(" ");
    expect(cues).toContain("점프");
    expect(cues).toContain("무릎과 고관절을 굽혀 부드럽게 착지");
  });
  it("only serves the equipment actually shown in reviewed videos", async () => {
    for (const [id, equipment] of [["side-lunge", "dumbbell"], ["kettlebell-lunge", "kettlebell"], ["dumbbell-jump-squat", "dumbbell"]]) {
      expect(await getExerciseMedia(id, equipment)).toMatchObject({ kind: "video", equipmentIds: [equipment] });
      expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
    }
  });
});
