import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
describe("incline machine press video", () => {
  it("connects the supported seated press with rigid lever arcs", async () => {
    const id = "incline-machine-chest-press";
    expect(await getExerciseMedia(id, "machine")).toMatchObject({kind: "video", equipmentIds: ["machine"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(guideFor(id).setup).toContain("등받이");
    expect(methodSteps(id, "machine").join(" ")).toContain("앞쪽 위로");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.linkLengthError).toBeLessThan(1e-5);
    expect(p.kinematics.handRise).toBeGreaterThan(2);
    expect(p.kinematics.handAdvance).toBeGreaterThan(2);
    expect(p.kinematics.loopError).toBe(0);
  });
});
