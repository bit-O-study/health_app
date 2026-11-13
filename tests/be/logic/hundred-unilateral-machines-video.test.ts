import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
describe("unilateral machine videos", () => {
  it.each(["single-arm-machine-chest-press", "single-arm-machine-shoulder-press", "single-arm-pec-deck-fly"])("connects %s and preserves the resting side", async id => {
    expect(await getExerciseMedia(id, "machine")).toMatchObject({kind: "video", equipmentIds: ["machine"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(methodSteps(id, "machine").join(" ")).toContain("독립");
    expect(guideFor(id).cues.join(" ")).toContain("왼팔");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.inactiveDrift).toBeLessThan(.001);
    expect(p.kinematics.supportDrift).toBeLessThan(.001);
    expect(p.kinematics.workingTravel).toBeGreaterThan(2);
    expect(p.kinematics.maxLinkError).toBeLessThan(.001);
    expect(p.kinematics.maxSeatGap).toBeLessThan(.05);
  });
});
