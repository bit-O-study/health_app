import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Alternating battle rope video", () => {
  it("connects opposing hands, stable stance and fixed anchor", async () => {
    const id = "battle-rope-wave";
    expect(await getExerciseMedia(id, "battlerope")).toMatchObject({kind: "video", equipmentIds: ["battlerope"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(methodSteps(id, "battlerope").join(" ")).toContain("두 팔을 번갈아");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.gripError).toBeLessThan(1e-5);
    expect(p.kinematics.anchorDrift).toBeLessThan(1e-5);
    expect(p.kinematics.oppositionError).toBeLessThan(1e-5);
    expect(p.kinematics.amplitude).toBeGreaterThan(2.1);
    expect(p.kinematics.cycles).toBe(4);
    expect(p.kinematics.loopError).toBe(0);
  });
});
