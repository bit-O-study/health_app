import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Standing broad jump video", () => {
  it("connects bilateral forward flight and walking reset", async () => {
    const id = "broad-jump";
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({kind: "video", equipmentIds: ["bodyweight"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(methodSteps(id, "bodyweight").join(" ")).toContain("앞으로 뛴다");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.stanceDrift).toBeLessThan(.01);
    expect(p.kinematics.symmetry).toBeLessThan(1e-5);
    expect(p.kinematics.travel).toBeGreaterThan(5.9);
    expect(p.kinematics.flightHeight).toBeGreaterThan(1.4);
    expect(p.kinematics.resetSteps).toBe(4);
    expect(p.kinematics.loopError).toBe(0);
  });
});
