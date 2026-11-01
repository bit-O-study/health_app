import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("loaded squat and reverse lunges", () => {
  it("distinguishes planted squats, partial-rise lunges and kettlebell loading", () => {
    expect(methodSteps("dumbbell-squat", "dumbbell").join(" ")).toContain("발 전체를 바닥에 붙인 채");
    expect(guideFor("1-5-rep-lunge").cues.join(" ")).toContain("3/4만");
    expect(guideFor("1-5-rep-lunge").cues.join(" ")).toContain("다시 아래로");
    expect(guideFor("kettlebell-reverse-lunge").setup).toContain("케틀벨 두 개");
  });
  it("selects only media matching the reviewed equipment", async () => {
    for (const [id, equipment] of [["dumbbell-squat", "dumbbell"], ["1-5-rep-lunge", "dumbbell"], ["kettlebell-reverse-lunge", "kettlebell"]]) {
      expect(await getExerciseMedia(id, equipment)).toMatchObject({ equipmentIds: [equipment], kind: "video" });
      expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
    }
  });
});
