import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("can raise video direction", () => {
  it.each(["full-can-raise", "empty-can-raise"])("connects %s with the correct thumb direction", async id => {
    expect(await getExerciseMedia(id, "dumbbell")).toMatchObject({kind: "video", equipmentIds: ["dumbbell"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "barbell")).toBeNull();
    expect(guideFor(id).setup).toContain("덤벨");
    expect(methodSteps(id, "dumbbell").join(" ")).toContain(id === "full-can-raise" ? "엄지가 위" : "엄지가 아래");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.planeError).toBeLessThan(1e-5);
    expect(p.kinematics.loopError).toBe(0);
    expect(p.kinematics.poseSamples).toBe(481);
    for (const y of p.kinematics.thumbSideAxisY) {
      expect(y * (id === "full-can-raise" ? 1 : -1)).toBeGreaterThan(.9);
    }
  });
});
