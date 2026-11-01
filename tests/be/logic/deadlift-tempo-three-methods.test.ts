import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("deadlift timing variants", () => {
  it("explains an ascent pause below the knee from the floor", () => {
    const steps = methodSteps("pause-deadlift", "barbell").join(" ");
    expect(steps).toContain("바닥");
    expect(steps).toContain("무릎 아래");
    expect(guideFor("pause-deadlift").cues.join(" ")).toContain("1.6초");
  });
  it("distinguishes controlled ascent and eccentric-only emphasis", () => {
    expect(guideFor("tempo-deadlift").cues.join(" ")).toContain("3.2초");
    expect(guideFor("eccentric-deadlift").cues.join(" ")).toContain("5.6초");
    for (const id of ["tempo-deadlift", "eccentric-deadlift"]) {
      expect(methodSteps(id, "barbell").join(" ")).toContain("바닥");
      expect(guideFor(id).setup).toContain("다리 바깥");
    }
  });
  it("uses barbell videos and rejects mismatched equipment", async () => {
    for (const id of ["pause-deadlift", "tempo-deadlift", "eccentric-deadlift"]) {
      expect(await getExerciseMedia(id, "barbell")).toMatchObject({ kind: "video", equipmentIds: ["barbell"] });
      expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
      expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
    }
  });
});
