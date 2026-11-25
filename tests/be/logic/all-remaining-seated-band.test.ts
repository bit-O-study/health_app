import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "seated-band-abduction";
it("connects seated abduction for band equipment in both themes", async () => {
  expect(await getExerciseMedia(id, "band")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("continuous");
});
it("opens the knees symmetrically while keeping feet and pelvis still", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/seated-band/native/${id}/kinematics.json`, "utf8"));
  expect(r.stationaryPelvis).toBe(true);
  expect(r.stationaryFeet).toBe(true);
  expect(r.symmetricKnees).toBe(true);
  expect(r.maxStep).toBeLessThan(0.035);
  expect(r.maxWidth - r.minWidth).toBeGreaterThan(2.8);
  expect(r.minSeatGap).toBeGreaterThan(0.01);
  expect(r.maxSeatGap).toBeLessThan(0.1);
  expect(r.minFootGap).toBeGreaterThan(0.01);
  expect(r.maxBandStretch).toBeGreaterThan(1.4);
  expect(r.maxBandStretch).toBeLessThan(1.5);
});
