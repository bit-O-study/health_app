import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const entries = [{ id: "eccentric-chin-up", equipment: "bodyweight" }, { id: "lat-pulldown-2", equipment: "cable" }, { id: "smith-machine-bench-press", equipment: "smith" }];
it.each(entries)("connects the specific equipment for $id", async ({ id, equipment }) => {
  expect(await getExerciseMedia(id, equipment)).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
});
it("keeps a five-second eccentric chin-up with stable grip", () => {
  const poses = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/pulls-smith/native/eccentric-chin-up/poses.json", "utf8"));
  expect(poses).toHaveLength(481);
  expect(poses[60].joints.root[1] - poses[0].joints.root[1]).toBeGreaterThan(4);
  for (let f = 60; f <= 120; f++) expect(poses[f].joints).toEqual(poses[60].joints);
  for (let f = 121; f <= 420; f++) expect(poses[f].joints.root[1]).toBeLessThanOrEqual(poses[f - 1].joints.root[1] + 1e-8);
  for (let f = 420; f <= 480; f++) expect(poses[f].joints).toEqual(poses[0].joints);
});
