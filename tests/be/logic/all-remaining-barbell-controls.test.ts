import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const ids = ["isometric-squat-hold", "isometric-bench-hold", "eccentric-bench-press"];
it.each(ids)("connects barbell media in both themes for %s", async (id) => {
  expect(await getExerciseMedia(id, "barbell")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
});
it.each(ids)("keeps the intended hold and lowering duration for %s", (id) => {
  const poses = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/barbell-controls/native/${id}/poses.json`, "utf8"));
  expect(poses).toHaveLength(481);
  if (id.startsWith("isometric")) for (const pose of poses) expect(pose.joints).toEqual(poses[0].joints);
  else {
    const top = poses[0].joints.barCenter[1], bottom = poses[180].joints.barCenter[1];
    expect(top - bottom).toBeGreaterThan(4);
    for (let f = 1; f <= 180; f++) expect(poses[f].joints.barCenter[1]).toBeLessThanOrEqual(poses[f - 1].joints.barCenter[1] + 1e-8);
    for (let f = 180; f <= 240; f++) expect(poses[f].joints).toEqual(poses[180].joints);
    for (let f = 300; f <= 480; f++) expect(poses[f].joints).toEqual(poses[0].joints);
  }
});
