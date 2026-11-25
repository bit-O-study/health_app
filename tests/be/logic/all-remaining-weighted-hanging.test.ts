import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects weighted hanging leg raise to both video themes", async () => {
  expect(await getExerciseMedia("weighted-hanging-leg-raise", "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/weighted-hanging-leg-raise.mp4"), darkUrl: expect.stringContaining("weighted-hanging-leg-raise-dark.mp4") });
  expect(await getExerciseMedia("weighted-hanging-leg-raise", "machine")).toBeNull();
});
it("raises straight legs to hip height with two secured ankle weights", () => {
  const report = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/weighted-hanging/native/weighted-hanging-leg-raise/kinematics.json", "utf8"));
  expect(report.weightedCuffs).toBe(2);
  expect(report.minimumCuffGap).toBeGreaterThan(0);
  expect(report.gripError).toBeLessThan(1e-7);
  expect(report.kneeRange[0]).toBeGreaterThan(179.99);
  expect(report.elevationRange[0]).toBeCloseTo(0);
  expect(report.elevationRange[1]).toBeCloseTo(90);
  const guide = JSON.parse(readFileSync("tools/media/motion-guides/weighted-hanging-leg-raise.json", "utf8"));
  expect(guide.timing).toBe("continuous");
});
