import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects band leg curl only to band equipment", async () => {
  expect(await getExerciseMedia("band-leg-curl", "band")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/band-leg-curl.mp4"), darkUrl: expect.stringContaining("band-leg-curl-dark.mp4") });
  expect(await getExerciseMedia("band-leg-curl", "bodyweight")).toBeNull();
});
it("keeps the cuff attached while the band stretches", () => {
  const report = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/band-leg-curl/native/band-leg-curl/kinematics.json", "utf8"));
  expect(report.cuffOffsetError).toBeLessThan(1e-10);
  expect(report.cuffGapRange[0]).toBeGreaterThan(0);
  expect(report.cuffGapRange[1]).toBeLessThan(0.03);
  expect(report.maxBandStretch).toBeGreaterThan(1.8);
  expect(report.maxBandStretch).toBeLessThan(2.3);
  expect(report.minimumBandRadius).toBeGreaterThan(0);
  expect(report.minimumBandRadius).toBeLessThan(0.085);
  expect(report.kneeRange).toEqual([80, 180]);
});
