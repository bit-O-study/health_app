import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in split media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("split stance movement distinctions", () => {
  it("keeps feet fixed for the level split squat", () => {
    expect(methodSteps("split-squat", "dumbbell").join(" ")).toContain("발 위치를 고정");
    expect(guideFor("split-squat").cues.join(" ")).toContain("발을 모으지 않고");
  });
  it("supports the front foot on a platform for elevated split squats", () => {
    expect(guideFor("front-foot-elevated-split-squat").setup).toContain("앞발 전체");
    expect(methodSteps("front-foot-elevated-split-squat", "dumbbell").join(" ")).toContain("뒷발 앞꿈치는 바닥");
  });
  it("returns the rear foot onto the platform for deficit reverse lunges", () => {
    expect(methodSteps("deficit-reverse-lunge", "dumbbell").join(" ")).toContain("뒤로 내딛어");
    expect(guideFor("deficit-reverse-lunge").cues.join(" ")).toContain("뒷발을 발판 위로");
  });
  it("only selects the reviewed dumbbell equipment", async () => {
    for (const id of ["split-squat", "front-foot-elevated-split-squat", "deficit-reverse-lunge"]) {
      expect(await getExerciseMedia(id, "dumbbell")).toMatchObject({ equipmentIds: ["dumbbell"], kind: "video" });
      expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
    }
  });
});
