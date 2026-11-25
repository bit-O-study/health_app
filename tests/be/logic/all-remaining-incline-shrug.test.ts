import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "prone-incline-dumbbell-shrug";
it("connects incline shrug to dumbbell videos in both themes", async () => {
  expect(await getExerciseMedia(id, "dumbbell")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
});
it("shrugs with straight arms and a stationary supported torso", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/incline-shrug/native/${id}/kinematics.json`, "utf8"));
  expect(r.stationarySupport).toBe(true);
  expect(r.straightArms).toBe(true);
  expect(r.shoulderRise).toBeGreaterThan(0.5);
  expect(r.shoulderRise).toBeLessThan(0.7);
  expect(r.minElbow).toBeGreaterThan(179.999);
  expect(r.chestGapRange[0]).toBeGreaterThanOrEqual(0);
  expect(r.chestGapRange[1]).toBeLessThan(0.02);
  expect(r.minimumWeightBodyGap).toBeGreaterThan(2);
  expect(r.minimumWeightPadGap).toBeGreaterThan(1.5);
});
