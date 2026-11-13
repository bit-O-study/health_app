import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Single-leg bridge video", () => {
  it("connects the unilateral bridge and preserves its support points", async () => {
    const id = "single-leg-glute-bridge";
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({kind: "video", equipmentIds: ["bodyweight"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(methodSteps(id, "bodyweight").join(" ")).toContain("반대쪽도");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.pelvisTilt).toBeLessThan(1e-5);
    expect(p.kinematics.raisedFoot).toBeGreaterThan(3);
    expect(p.kinematics.hipRise).toBeGreaterThan(2);
    expect(p.kinematics.topHipAngle).toBeGreaterThan(160);
    expect(p.kinematics.loopError).toBe(0);
  });
});
