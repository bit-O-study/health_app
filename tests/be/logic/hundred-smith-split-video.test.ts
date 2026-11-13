import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
describe("Smith split squat video", () => {
  it("connects a planted staggered stance with a vertical back bar", async () => {
    const id = "smith-machine-split-squat";
    expect(await getExerciseMedia(id, "smith")).toMatchObject({kind: "video", equipmentIds: ["smith"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(guideFor(id).setup).toContain("뒷발 앞꿈치");
    expect(methodSteps(id, "smith").join(" ")).toContain("반대쪽 다리");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.railDrift).toBeLessThan(1e-5);
    expect(p.kinematics.squatDepth).toBeGreaterThan(3.2);
    expect(p.kinematics.loopError).toBe(0);
    for (const g of p.geometry) expect(g.floorClearance).toBeGreaterThan(0);
  });
});
