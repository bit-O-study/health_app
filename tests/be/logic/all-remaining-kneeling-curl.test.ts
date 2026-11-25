import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects kneeling leg curl to both machine video themes", async () => {
  expect(await getExerciseMedia("kneeling-leg-curl-machine", "machine")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/kneeling-leg-curl-machine.mp4"), darkUrl: expect.stringContaining("kneeling-leg-curl-machine-dark.mp4") });
  expect(await getExerciseMedia("kneeling-leg-curl-machine", "cable")).toBeNull();
});
it("supports the idle knee and elbows while the working leg moves the load", () => {
  const report = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/kneeling-curl/native/kneeling-leg-curl-machine/kinematics.json", "utf8"));
  expect(report.gripError).toBeLessThan(1e-7);
  expect(report.supportKneeDegrees).toBe(90);
  expect(report.elbowPads).toBe(2);
  expect(report.kneeRange[0]).toBeCloseTo(80);
  expect(report.kneeRange[1]).toBeCloseTo(180);
  expect(report.rollerGapRange[0]).toBeGreaterThan(0);
  expect(report.loadRise).toBeGreaterThan(3);
});
