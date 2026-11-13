import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Box jump video", () => {
  it("connects raised landing and alternating step-down", async () => {
    const id = "box-jump";
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({kind: "video", equipmentIds: ["bodyweight"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(methodSteps(id, "bodyweight").join(" ")).toContain("박스 위로 뛴다");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.stanceDrift).toBeLessThan(.01);
    expect(p.kinematics.symmetry).toBeLessThan(1e-5);
    expect(p.kinematics.travel).toBeGreaterThan(5.9);
    expect(p.kinematics.boxRise).toBeCloseTo(3, 5);
    expect(p.kinematics.stepDownGap).toBeCloseTo(3, 5);
    expect(p.kinematics.loopError).toBe(0);
  });
});
