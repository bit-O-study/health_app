import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "swimmer-exercise";
it("connects swimmer to bodyweight videos in both themes", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
});
it("alternates opposite extended limbs above the mat with a stable trunk", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/swimmer/native/${id}/kinematics.json`, "utf8"));
  expect(r.stationaryTrunk).toBe(true);
  expect(r.oppositeLimbs).toBe(true);
  expect(r.armTravel).toBeGreaterThan(0.7);
  expect(r.legTravel).toBeGreaterThan(0.9);
  expect(r.minAngle).toBeGreaterThan(179.999);
  expect(r.bodyGap).toBeGreaterThan(0.05);
  expect(r.clothGap).toBeGreaterThan(0.1);
  expect(r.palmGap).toBeGreaterThan(1);
  expect(r.toeGap).toBeGreaterThan(0.3);
});
