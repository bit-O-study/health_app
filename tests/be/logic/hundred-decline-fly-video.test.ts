import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
describe("decline fly video", () => {
  it("connects the supported decline fly and stable elbow arc", async () => {
    const id = "decline-dumbbell-fly";
    expect(await getExerciseMedia(id, "dumbbell")).toMatchObject({kind: "video", equipmentIds: ["dumbbell"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "smith")).toBeNull();
    expect(guideFor(id).setup).toContain("머리가 낮아지는");
    expect(methodSteps(id, "dumbbell").join(" ")).toContain("각도를 유지");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.benchDeclineDegrees).toBe(30);
    expect(p.kinematics.elbowRange[0]).toBeGreaterThan(159);
    expect(p.kinematics.elbowRange[1]).toBeLessThan(161);
    expect(p.kinematics.loopError).toBe(0);
  });
});
