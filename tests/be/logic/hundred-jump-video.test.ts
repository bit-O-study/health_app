import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("bodyweight jump squat video", () => {
  it("instructs a vertical jump and flexed landing without weights", () => {
    const steps = methodSteps("jump-squat", "bodyweight").join(" ");
    expect(steps).toContain("수직으로 점프");
    expect(steps).toContain("착지할 때 무릎과 엉덩이를 굽혀");
    expect(steps).not.toContain("덤벨");
    expect(guideFor("jump-squat").beginnerTips.join(" ")).toContain("실제 점프 속도");
  });
  it("serves both reviewed themes and records the landing correction", async () => {
    expect(await getExerciseMedia("jump-squat", "bodyweight")).toMatchObject({ kind: "video", equipmentIds: ["bodyweight"], url: expect.stringContaining("/ai-v3/jump-squat.mp4"), darkUrl: expect.stringContaining("jump-squat-dark.mp4") });
    expect(await getExerciseMedia("jump-squat", "dumbbell")).toBeNull();
    const p = JSON.parse(readFileSync("tools/media/motion-guides/jump-squat-provenance.json", "utf8"));
    expect(p.kinematics.landingKnee).toBeLessThan(160);
    expect(p.kinematics.apexHeight).toBeGreaterThan(1.4);
    expect(p.kinematics.maxGroundToeDrift).toBeLessThan(.001);
    expect(p.verification.poseSamples).toBe(481);
  });
});
