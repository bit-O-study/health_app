import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
describe("prone cobra video", () => {
  it("connects back extension with fixed legs and arms reaching back", async () => {
    const id = "prone-cobra";
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({kind: "video", equipmentIds: ["bodyweight"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(guideFor(id).setup).toContain("엎드려");
    expect(methodSteps(id, "bodyweight").join(" ")).toContain("엄지가 위");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.headRise).toBeGreaterThan(1);
    expect(p.kinematics.loopError).toBe(0);
    for (const g of p.geometry) expect(g.floorClearance).toBeGreaterThanOrEqual(0);
  });
});
