import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects both alternating leg-lift themes", async () => {
  expect(await getExerciseMedia("plank-with-leg-lift", "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/plank-with-leg-lift.mp4"), darkUrl: expect.stringContaining("plank-with-leg-lift-dark.mp4") });
  expect(await getExerciseMedia("plank-with-leg-lift", "plate")).toBeNull();
});
it("holds the pelvis and arms steady while both straight legs lift in turn", () => {
  const report = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/plank-leg-lift/native/plank-with-leg-lift/kinematics.json", "utf8"));
  expect(report.maxFixedError).toBeLessThan(1e-10);
  expect(report.minKnee).toBeGreaterThan(179.99);
  expect(report.lifts.every((x: number) => x > 1.5 && x < 2)).toBe(true);
});
