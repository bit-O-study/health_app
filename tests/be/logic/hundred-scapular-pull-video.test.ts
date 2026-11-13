import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
describe("scapular pull-up video", () => {
  it("connects a short straight-arm hang with matching cues", async () => {
    const id = "scapular-pull-up";
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({kind: "video", equipmentIds: ["bodyweight"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(guideFor(id).setup).toContain("철봉");
    expect(methodSteps(id, "bodyweight").join(" ")).toContain("팔꿈치를 굽히지 않고");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.handDrift).toBeLessThan(1e-5);
    expect(p.kinematics.bodyRise).toBeLessThan(.5);
    expect(p.kinematics.elbowRange[0]).toBeGreaterThan(174);
    expect(p.kinematics.loopError).toBe(0);
    for (const g of p.geometry) expect(g.floorClearance).toBeGreaterThan(.4);
  });
});
