import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Skater bound video", () => {
  it("connects lateral travel with alternating single-foot support", async () => {
    const id = "skater-jump";
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({kind: "video", equipmentIds: ["bodyweight"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(methodSteps(id, "bodyweight").join(" ")).toContain("옆으로 뛰고");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.stanceDrift).toBeLessThan(1e-5);
    expect(p.kinematics.airFrames).toBe(166);
    expect(p.kinematics.freeFootClearance).toBeGreaterThan(1.4);
    expect(p.kinematics.lateralTravel).toBeGreaterThan(5);
    expect(p.kinematics.loopError).toBe(0);
  });
});
