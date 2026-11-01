import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
import { motionCategoryFor } from "@/features/workout-timer/exercise-motion";

describe("supported and isometric deadlift variants", () => {
  it("distinguishes plate blocks from shaft pins", () => {
    expect(motionCategoryFor("block-pull")).toBe("hinge");
    expect(guideFor("block-pull").setup).toContain("원판");
    expect(methodSteps("block-pull", "barbell").join(" ")).toContain("블록");
    expect(guideFor("pin-deadlift").setup).toContain("안전핀");
    expect(methodSteps("pin-deadlift", "barbell").join(" ")).toContain("바");
  });
  it("describes a yielding hold below the knee", () => {
    expect(guideFor("isometric-deadlift-hold").cues.join(" ")).toContain("4초");
    expect(methodSteps("isometric-deadlift-hold", "barbell").join(" ")).toContain("무릎 아래");
    expect(guideFor("isometric-deadlift-hold").cues.join(" ")).toContain("다시 바닥");
  });
  it("selects exact barbell media without equipment fallback", async () => {
    for (const id of ["block-pull", "pin-deadlift", "isometric-deadlift-hold"]) {
      expect(await getExerciseMedia(id, "barbell")).toMatchObject({ kind: "video", equipmentIds: ["barbell"] });
      expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
      expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
    }
  });
});
