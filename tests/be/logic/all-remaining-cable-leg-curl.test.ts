import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects cable leg curl only to cable equipment", async () => {
  expect(await getExerciseMedia("cable-leg-curl", "cable")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/cable-leg-curl.mp4"), darkUrl: expect.stringContaining("cable-leg-curl-dark.mp4") });
  expect(await getExerciseMedia("cable-leg-curl", "bodyweight")).toBeNull();
});
it("keeps the ankle cuff attached and the cable length constant", () => {
  const report = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/cable-leg-curl/native/cable-leg-curl/kinematics.json", "utf8"));
  expect(report.cuffOffsetError).toBeLessThan(1e-10);
  expect(report.cuffGapRange[0]).toBeGreaterThan(0);
  expect(report.cuffGapRange[1]).toBeLessThan(0.03);
  expect(report.cableLengthError).toBeLessThan(1e-10);
  expect(report.stackTravel).toBeGreaterThan(5);
  expect(report.kneeRange).toEqual([80, 180]);
});
