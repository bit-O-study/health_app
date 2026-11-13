import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Jump rope video", () => {
  it("connects handle tracking and synchronized rope clearance", async () => {
    const id = "jump-rope";
    expect(await getExerciseMedia(id, "other")).toMatchObject({kind: "video", equipmentIds: ["other"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(methodSteps(id, "other").join(" ")).toContain("줄이 발밑을");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.stanceDrift).toBeLessThan(1e-5);
    expect(p.kinematics.gripError).toBeLessThan(1e-5);
    expect(p.kinematics.repeatError).toBeLessThan(1e-5);
    expect(p.kinematics.minimumRopeBody).toBeGreaterThan(0);
    expect(p.kinematics.ropeBelowToes).toBeGreaterThan(.6);
    expect(p.kinematics.cycles).toBe(4);
    expect(p.kinematics.loopError).toBe(0);
  });
});
