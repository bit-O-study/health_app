import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => { throw new Error("Expected built-in lunge media"); },
}));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("lunge demonstrations retain their movement differences", () => {
  it("matches reviewed equipment for all three built-in videos", async () => {
    expect(await getExerciseMedia("lunge", "bodyweight")).toMatchObject({ equipmentIds: ["bodyweight"], kind: "video" });
    expect(await getExerciseMedia("lunge", "dumbbell")).toBeNull();
    expect(await getExerciseMedia("pulse-lunge", "bodyweight")).toMatchObject({ equipmentIds: ["bodyweight"] });
    expect(await getExerciseMedia("reverse-lunge", "dumbbell")).toMatchObject({ equipmentIds: ["dumbbell"] });
    expect(await getExerciseMedia("reverse-lunge", "bodyweight")).toBeNull();
  });
  it("forward lunge steps forward and pushes through the whole front foot", () => {
    const text = methodSteps("lunge", "bodyweight").join(" ");
    expect(text).toContain("앞으로");
    expect(text).toContain("앞발 전체로");
    expect(text).toContain("반대쪽");
    expect(guideFor("lunge").setup).toContain("맨몸");
  });
  it("pulse lunge fixes the split stance and does not stand between pulses", () => {
    const text = methodSteps("pulse-lunge", "bodyweight").join(" ");
    expect(text).toContain("발 위치를 고정");
    expect(text).toContain("완전히 일어서지");
    expect(guideFor("pulse-lunge").cues.join(" ")).toContain("짧게");
  });
  it("reverse lunge uses two dumbbells and a backward step", () => {
    const text = methodSteps("reverse-lunge", "dumbbell").join(" ");
    expect(text).toContain("양손에 하나씩");
    expect(text).toContain("뒤로 내딛");
    expect(guideFor("reverse-lunge").cues.join(" ")).toContain("앞발 전체를 고정");
  });
});
