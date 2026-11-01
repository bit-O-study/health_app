import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("dumbbell hinge distinctions", () => {
  it("retains the soft knee bend in the RDL", () => {
    expect(methodSteps("dumbbell-romanian-deadlift", "dumbbell").join(" ")).toContain("무릎 굽힘을 유지");
    expect(guideFor("dumbbell-romanian-deadlift").cues.join(" ")).toContain("엉덩이를 뒤로");
  });
  it("keeps stiff legs nearly straight without locking", () => {
    expect(guideFor("dumbbell-stiff-leg-deadlift").setup).toContain("거의 편");
    expect(guideFor("dumbbell-stiff-leg-deadlift").cues.join(" ")).toContain("무릎을 잠그지 않고");
  });
  it("uses a supported rear toe, not a lifted single leg", () => {
    expect(guideFor("b-stance-romanian-deadlift").setup).toContain("앞꿈치를 댄다");
    expect(guideFor("b-stance-romanian-deadlift").cues.join(" ")).toContain("균형 보조");
  });
  it("selects the reviewed dumbbell media only", async () => {
    for (const id of ["dumbbell-romanian-deadlift", "dumbbell-stiff-leg-deadlift", "b-stance-romanian-deadlift"]) {
      expect(await getExerciseMedia(id, "dumbbell")).toMatchObject({ kind: "video", equipmentIds: ["dumbbell"] });
      expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
    }
  });
});
