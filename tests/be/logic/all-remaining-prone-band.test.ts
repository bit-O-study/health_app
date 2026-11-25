import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "prone-band-pull-apart";
it("connects prone pull-apart to band equipment in both themes", async () => {
  expect(await getExerciseMedia(id, "band")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
});
it("stretches the band between both hands without body contact", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/prone-band/native/${id}/kinematics.json`, "utf8"));
  expect(r.stationaryBody).toBe(true);
  expect(r.minElbow).toBeGreaterThan(179.999);
  expect(r.maximumBandStretch).toBeGreaterThan(1.7);
  expect(r.maximumBandStretch).toBeLessThan(1.9);
  expect(r.maximumGripError).toBeLessThan(1e-10);
  expect(r.minimumBandBodyGap).toBeGreaterThan(0.4);
  expect(r.minimumBandFloorGap).toBeGreaterThan(2);
});
