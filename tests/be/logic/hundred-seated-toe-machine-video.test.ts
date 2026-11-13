import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
describe("seated toe raise video", () => {
  it("connects dorsiflexion with stationary heels and seated cues", async () => {
    const id = "seated-toe-raise";
    expect(await getExerciseMedia(id, "machine")).toMatchObject({kind: "video", equipmentIds: ["machine"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(guideFor(id).setup).toContain("의자");
    expect(methodSteps(id, "machine").join(" ")).toContain("뒤꿈치를 고정");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.heelError).toBeLessThan(1e-5);
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.toeRise).toBeGreaterThan(.5);
    expect(p.kinematics.loopError).toBe(0);
    for (const g of p.geometry) expect(g.floorClearance).toBeGreaterThanOrEqual(0);
  });
});
