import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "band-clamshell";
it("connects band clamshell in both themes only for band equipment", async () => {
  expect(await getExerciseMedia(id, "band")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("continuous");
});
it("opens the bent upper knee with fixed feet and pelvis and a stretching band", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/band-clam/native/${id}/kinematics.json`, "utf8"));
  expect(r.stationaryPelvis).toBe(true);
  expect(r.stationaryFeet).toBe(true);
  expect(r.minKnee).toBeGreaterThan(89);
  expect(r.maxKnee).toBeLessThan(95);
  expect(r.maxStep).toBeLessThan(0.035);
  expect(r.kneeRise).toBeGreaterThan(1.8);
  expect(r.maxFootContactGap).toBeLessThan(0.08);
  expect(r.minBandFloorClearance).toBeGreaterThan(0.08);
  expect(r.maxBandStretch).toBeGreaterThan(1.3);
  expect(r.maxBandStretch).toBeLessThan(1.4);
});
