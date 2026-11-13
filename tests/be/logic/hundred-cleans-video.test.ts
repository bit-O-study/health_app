import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Clean videos", () => {
  for (const id of ["power-clean", "hang-clean"]) it(id + " preserves its start and catch", async () => {
    expect(await getExerciseMedia(id, "barbell")).toMatchObject({kind: "video", equipmentIds: ["barbell"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(methodSteps(id, "barbell").join(" ")).toContain("팔꿈치를 앞으로");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.gripError).toBeLessThan(1e-5);
    expect(p.kinematics.initialElbow).toBeGreaterThan(145);
    expect(p.kinematics.rackRise).toBeGreaterThan(8);
    if (id === "power-clean") {
      expect(p.kinematics.catchKnee).toBeGreaterThan(90);
      expect(p.kinematics.plateFloor).toBeLessThan(.03);
    } else {
      expect(p.kinematics.catchKnee).toBeLessThan(90);
      expect(p.kinematics.plateFloor).toBeGreaterThan(3);
    }
    expect(p.kinematics.loopError).toBe(0);
  });
});
