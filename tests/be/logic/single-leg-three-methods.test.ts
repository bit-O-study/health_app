import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

const cases = [
  ["single-leg-romanian-deadlift", "dumbbell"],
  ["kettlebell-single-leg-deadlift", "kettlebell"],
  ["barbell-single-leg-romanian-deadlift", "barbell"],
] as const;
describe("single-leg hinge instructions and media", () => {
  it("distinguishes an airborne foot from kickstand support", () => {
    for (const [id, equipment] of cases) {
      expect(methodSteps(id, equipment).join(" ")).toContain("바닥에서 띄운다");
      expect(guideFor(id).cues.join(" ")).toContain("발을 바꾼다");
    }
  });
  it("makes the double-kettlebell variant explicit", () => {
    expect(guideFor(cases[1][0]).setup).toContain("케틀벨 두 개");
  });
  it("uses a double overhand barbell grip", () => {
    expect(guideFor(cases[2][0]).setup).toContain("양손 오버핸드 그립");
  });
  it("only selects media matching the requested equipment", async () => {
    for (const [id, equipment] of cases) {
      expect(await getExerciseMedia(id, equipment)).toMatchObject({ kind: "video", equipmentIds: [equipment] });
      expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
      expect(await getExerciseMedia(id, equipment === "barbell" ? "dumbbell" : "barbell")).toBeNull();
    }
  });
});
