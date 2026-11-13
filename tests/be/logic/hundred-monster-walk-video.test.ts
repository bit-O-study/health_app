import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Band monster walk video", () => {
  it("connects diagonal steps with stable stance feet", async () => {
    const id = "band-monster-walk";
    expect(await getExerciseMedia(id, "band")).toMatchObject({kind: "video", equipmentIds: ["band"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(methodSteps(id, "band").join(" ")).toContain("앞 대각선");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.stanceDrift).toBeLessThan(1e-5);
    expect(p.kinematics.rootHeightDrift).toBeLessThan(1e-5);
    expect(p.kinematics.minWidth).toBeGreaterThan(3.9);
    expect(p.kinematics.travel).toBeGreaterThan(2.9);
    expect(p.kinematics.swingLift).toBeGreaterThan(.6);
    expect(p.kinematics.loopError).toBe(0);
  });
});
