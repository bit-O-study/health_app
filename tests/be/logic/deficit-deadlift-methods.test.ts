import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
import { motionCategoryFor } from "@/features/workout-timer/exercise-motion";

describe("deficit deadlift demonstration", () => {
  it("describes feet on a platform and plates returning to the floor", () => {
    expect(motionCategoryFor("deficit-deadlift")).toBe("hinge");
    expect(guideFor("deficit-deadlift").setup).toContain("발판");
    const steps = methodSteps("deficit-deadlift", "barbell").join(" ");
    expect(steps).toContain("발판");
    expect(steps).toContain("원판을 바닥");
  });
  it("uses only the exact barbell video", async () => {
    expect(await getExerciseMedia("deficit-deadlift", "barbell")).toMatchObject({ kind: "video", equipmentIds: ["barbell"] });
    expect(await getExerciseMedia("deficit-deadlift", "dumbbell")).toBeNull();
  });
});
