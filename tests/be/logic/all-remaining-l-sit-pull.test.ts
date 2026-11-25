import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects L-sit pull-up to both reviewed video themes", async () => {
  expect(await getExerciseMedia("l-sit-pull-up", "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/l-sit-pull-up.mp4"), darkUrl: expect.stringContaining("l-sit-pull-up-dark.mp4") });
  expect(await getExerciseMedia("l-sit-pull-up", "machine")).toBeNull();
});
it("maintains horizontal straight legs during a full vertical pull", () => {
  const r = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/l-sit-pull/native/l-sit-pull-up/kinematics.json", "utf8"));
  expect(r.gripError).toBeLessThan(1e-7);
  expect(r.relativeLegDrift).toBeLessThan(1e-7);
  expect(r.kneeRange[0]).toBeGreaterThan(179.99);
  expect(r.elevationRange[0]).toBeCloseTo(90);
  expect(r.elevationRange[1]).toBeCloseTo(90);
  expect(r.bodyRise).toBeGreaterThan(4.6);
  expect(r.elbowRange[0]).toBeLessThan(60);
  expect(r.elbowRange[1]).toBeGreaterThan(178);
});
