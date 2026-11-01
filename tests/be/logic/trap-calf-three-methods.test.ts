import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("trap bar and eccentric calf videos", () => {
  it("describes standing-start trap bar RDL with side handles", () => {
    expect(guideFor("trap-bar-romanian-deadlift").setup).toContain("트랩바 안");
    expect(methodSteps("trap-bar-romanian-deadlift", "barbell").join(" ")).toContain("양옆 손잡이");
    expect(guideFor("trap-bar-romanian-deadlift").cues.join(" ")).toContain("엉덩이를 뒤로");
  });
  it("describes calf support and keeps trap bar arms long", () => {
    expect(methodSteps("trap-bar-calf-raise", "barbell").join(" ")).toContain("발판");
    expect(guideFor("trap-bar-calf-raise").cues.join(" ")).toContain("팔을 길게");
    expect(guideFor("trap-bar-calf-raise").cues.join(" ")).toContain("뒤꿈치");
  });
  it("explains bilateral supported slow lowering", () => {
    const text = methodSteps("eccentric-calf-raise", "bodyweight").join(" ");
    expect(text).toContain("양손");
    expect(text).toContain("양발");
    expect(text).toContain("천천히");
    expect(guideFor("eccentric-calf-raise").cues.join(" ")).toContain("발판보다 아래");
  });
  it("selects exact media and rejects wrong equipment", async () => {
    for (const [id, equipment] of [
      ["trap-bar-romanian-deadlift", "barbell"],
      ["trap-bar-calf-raise", "barbell"],
      ["eccentric-calf-raise", "bodyweight"],
    ] as const) {
      expect(await getExerciseMedia(id, equipment)).toMatchObject({ kind: "video", equipmentIds: [equipment] });
      expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
      expect(await getExerciseMedia(id, equipment === "barbell" ? "bodyweight" : "barbell")).toBeNull();
    }
  });
});
