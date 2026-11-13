import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
describe("Smith decline press video", () => {
  it("connects the supported decline press and guided bar path", async () => {
    const id = "smith-machine-decline-press";
    expect(await getExerciseMedia(id, "smith")).toMatchObject({kind: "video", equipmentIds: ["smith"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(guideFor(id).setup).toContain("머리가 낮아지도록");
    expect(methodSteps(id, "smith").join(" ")).toContain("수직으로");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.railDrift).toBeLessThan(1e-5);
    expect(p.kinematics.barTravel).toBeGreaterThan(3.1);
    expect(p.kinematics.benchDeclineDegrees).toBe(30);
    expect(p.kinematics.loopError).toBe(0);
  });
});
