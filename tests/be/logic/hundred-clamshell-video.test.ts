import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Banded clamshell video", () => {
  it("connects the band variation with a fixed pelvis and feet", async () => {
    const id = "clamshell";
    expect(await getExerciseMedia(id, "band")).toMatchObject({kind: "video", equipmentIds: ["band"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(methodSteps(id, "band").join(" ")).toContain("발을 붙인 채");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.footGapError).toBeLessThan(1e-5);
    expect(p.kinematics.kneeRise).toBeGreaterThan(2);
    expect(p.kinematics.bandExpansion).toBeGreaterThan(1);
    expect(p.kinematics.loopError).toBe(0);
  });
});
