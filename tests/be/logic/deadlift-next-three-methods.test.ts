import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("three distinct deadlift demonstrations", () => {
  it("distinguishes two floor dumbbells from one mid-shin dumbbell", () => {
    expect(methodSteps("dumbbell-deadlift", "dumbbell").join(" ")).toContain("양손");
    expect(guideFor("dumbbell-deadlift").setup).toContain("바닥");
    expect(methodSteps("single-arm-dumbbell-deadlift", "dumbbell").join(" ")).toContain("한손");
    expect(guideFor("single-arm-dumbbell-deadlift").cues.join(" ")).toContain("정강이 중간");
  });
  it("explicitly describes the high rack version of partial deadlift", () => {
    expect(guideFor("partial-deadlift").setup).toContain("무릎 위");
    expect(methodSteps("partial-deadlift", "barbell").join(" ")).toContain("안전핀");
  });
  it.each(["dumbbell-deadlift", "single-arm-dumbbell-deadlift", "partial-deadlift"])("selects only reviewed equipment for %s", async id => {
    const equipment = id === "partial-deadlift" ? "barbell" : "dumbbell";
    expect(await getExerciseMedia(id, equipment)).toMatchObject({ kind: "video", equipmentIds: [equipment] });
    expect(await getExerciseMedia(id, equipment === "barbell" ? "dumbbell" : "barbell")).toBeNull();
  });
});
