import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("farmer carry video", () => {
  it("describes two weights and forward walking", () => {
    const text = methodSteps("farmer-s-carry", "dumbbell").join(" ");
    expect(text).toContain("덤벨을 하나씩");
    expect(text).toContain("앞으로 걷는다");
    expect(guideFor("farmer-s-carry").beginnerTips.join(" ")).toContain("인물을 따라가는");
  });
  it("serves both themes with grip and support evidence", async () => {
    expect(await getExerciseMedia("farmer-s-carry", "dumbbell")).toMatchObject({ kind: "video", equipmentIds: ["dumbbell"], url: expect.stringContaining("farmer-s-carry.mp4"), darkUrl: expect.stringContaining("farmer-s-carry-dark.mp4") });
    expect(await getExerciseMedia("farmer-s-carry", "barbell")).toBeNull();
    const p = JSON.parse(readFileSync("tools/media/motion-guides/farmer-s-carry-provenance.json", "utf8"));
    expect(p.kinematics.poseSamples).toBe(481);
    expect(p.kinematics.stanceWorldDrift).toBeLessThan(.001);
    expect(p.kinematics.airborneSamples).toBeGreaterThan(100);
    expect(p.kinematics.minimumPlateBodyGap).toBeGreaterThan(0);
  });
});
