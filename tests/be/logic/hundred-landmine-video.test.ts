import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
describe("landmine squat video", () => {
  it("connects an anchored arc and planted squat with matching equipment", async () => {
    const id = "landmine-squat";
    expect(await getExerciseMedia(id, "landmine")).toMatchObject({kind: "video", equipmentIds: ["landmine"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(guideFor(id).setup).toContain("랜드마인");
    expect(methodSteps(id, "landmine").join(" ")).toContain("원호");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.barLengthError).toBeLessThan(1e-5);
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.squatDepth).toBeGreaterThan(4);
    expect(p.kinematics.loopError).toBe(0);
    for (const g of p.geometry) expect(g.plateBody).toBeGreaterThan(0);
  });
});
