import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Alternating jump lunge video", () => {
  it("connects airborne leg changes and grounded landings", async () => {
    const id = "jump-lunge";
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({kind: "video", equipmentIds: ["bodyweight"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(methodSteps(id, "bodyweight").join(" ")).toContain("공중에서");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.stanceDrift).toBeLessThan(1e-5);
    expect(p.kinematics.airFrames).toBe(166);
    expect(p.kinematics.flightHeight).toBeGreaterThan(1.5);
    expect(p.kinematics.landingKnees.every((a: number) => a > 65 && a < 110)).toBe(true);
    expect(p.kinematics.loopError).toBe(0);
  });
});
