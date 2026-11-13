import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Stability ball curl video", () => {
  it("connects a ball curl with synchronized feet", async () => {
    const id = "stability-ball-hamstring-curl";
    expect(await getExerciseMedia(id, "ball")).toMatchObject({kind: "video", equipmentIds: ["ball"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
    expect(methodSteps(id, "ball").join(" ")).toContain("양쪽 무릎을 굽혀");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.rollingError).toBeLessThan(1e-5);
    expect(p.kinematics.kneeRange[0]).toBeLessThan(90);
    expect(p.kinematics.kneeRange[1]).toBeGreaterThan(140);
    expect(p.kinematics.heelTravel).toBeGreaterThan(3);
    expect(p.kinematics.symmetry).toBeLessThan(1e-5);
    expect(p.kinematics.loopError).toBe(0);
  });
});
