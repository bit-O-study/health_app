import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("next hinge videos", () => {
  it("describes two kettlebells with fixed soft knees", () => {
    expect(methodSteps("double-kettlebell-romanian-deadlift", "kettlebell").join(" ")).toContain("케틀벨 두 개");
    expect(guideFor("double-kettlebell-romanian-deadlift").cues.join(" ")).toContain("각도를 유지");
  });
  it("keeps single-leg alias a barbell movement with the free foot airborne", () => {
    expect(methodSteps("single-leg-deadlift", "barbell").join(" ")).toContain("바닥에서 띄운다");
    expect(guideFor("single-leg-deadlift").setup).toContain("바벨");
    expect(guideFor("single-leg-deadlift").cues.join(" ")).toContain("발을 바꾼다");
  });
  it("explains the standing-start stiff-leg variant without floor contact", () => {
    expect(guideFor("stiff-leg-deadlift").setup).toContain("선 자세");
    expect(guideFor("stiff-leg-deadlift").cues.join(" ")).toContain("바닥에 닿기 전");
    expect(methodSteps("stiff-leg-deadlift", "barbell").join(" ")).toContain("무릎 거의 펴고");
  });
  it("selects only matching equipment for all three IDs", async () => {
    for (const [id, equipment] of [
      ["double-kettlebell-romanian-deadlift", "kettlebell"],
      ["single-leg-deadlift", "barbell"],
      ["stiff-leg-deadlift", "barbell"],
    ] as const) {
      expect(await getExerciseMedia(id, equipment)).toMatchObject({ kind: "video", equipmentIds: [equipment] });
      expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
      expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    }
  });
});
