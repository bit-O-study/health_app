import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const entries = [
  { id: "tempo-pull-up", equipment: "bodyweight", hold: false },
  { id: "tempo-leg-press", equipment: "machine", hold: false },
  { id: "isometric-pull-up-hold", equipment: "bodyweight", hold: true },
  { id: "isometric-push-up-hold", equipment: "bodyweight", hold: true },
];
it.each(entries)("connects reviewed media with matching equipment for $id", async ({ id, equipment }) => {
  expect(await getExerciseMedia(id, equipment)).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "barbell")).toBeNull();
});
it.each(entries)("preserves the rendered hold or tempo for $id", ({ id, hold }) => {
  const poses = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/tempo-holds/native/${id}/poses.json`, "utf8"));
  expect(poses).toHaveLength(481);
  if (hold) for (const pose of poses) expect(pose.joints).toEqual(poses[0].joints);
  else {
    for (let f = 60; f <= 120; f++) expect(poses[f].joints).toEqual(poses[60].joints);
    for (let f = 300; f <= 480; f++) expect(poses[f].joints).toEqual(poses[0].joints);
    expect(poses[0].joints).not.toEqual(poses[60].joints);
  }
});
