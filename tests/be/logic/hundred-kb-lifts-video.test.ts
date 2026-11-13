import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Single-arm kettlebell lifts", () => {
  for (const id of ["kettlebell-clean", "kettlebell-snatch"]) it(id + " retains its distinct finish", async () => {
    expect(await getExerciseMedia(id, "kettlebell")).toMatchObject({kind: "video", equipmentIds: ["kettlebell"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "barbell")).toBeNull();
    expect(methodSteps(id, "kettlebell").join(" ")).toContain("한 손");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.gripError).toBeLessThan(1e-5);
    if (id === "kettlebell-snatch") {
      expect(p.kinematics.topElbow).toBeGreaterThan(160);
      expect(p.kinematics.handAboveShoulder).toBeGreaterThan(6);
    } else {
      expect(p.kinematics.topElbow).toBeLessThan(100);
      expect(p.kinematics.handAboveShoulder).toBeLessThan(1);
    }
    expect(p.kinematics.loopError).toBe(0);
  });
});
