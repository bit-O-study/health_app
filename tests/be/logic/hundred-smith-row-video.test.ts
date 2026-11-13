import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
describe("Smith row video", () => {
  it("connects the Smith-specific vertical row and matching cues", async () => {
    const id = "smith-machine-bent-over-row";
    expect(await getExerciseMedia(id, "smith")).toMatchObject({kind: "video", equipmentIds: ["smith"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(guideFor(id).setup).toContain("스미스");
    expect(methodSteps(id, "smith").join(" ")).toContain("레일");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.verticalError).toBeLessThan(1e-5);
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.gripError).toBeLessThan(1e-5);
    expect(p.kinematics.loopError).toBe(0);
    for (const g of p.geometry) expect(g.shaftBody).toBeGreaterThan(0);
  });
});
