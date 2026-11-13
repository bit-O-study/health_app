import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
it("windmill keeps fixed feet and a vertical loaded arm during the hinge", async () => {
  const id = "kettlebell-windmill";
  expect(await getExerciseMedia(id, "kettlebell")).toMatchObject({kind: "video", equipmentIds: ["kettlebell"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
  expect(await getExerciseMedia(id, "barbell")).toBeNull();
  expect(methodSteps(id, "kettlebell").join(" ")).toContain("수직");
  const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
  expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
  expect(p.kinematics.gripError).toBeLessThan(1e-5);
  expect(p.kinematics.verticalError).toBeLessThan(1e-5);
  expect(p.kinematics.freeHandDrop).toBeGreaterThan(3);
  expect(p.kinematics.minElbow).toBeGreaterThan(155);
  expect(p.kinematics.loopError).toBe(0);
});
