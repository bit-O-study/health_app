import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const ids = ["single-leg-extension", "single-leg-curl", "leg-curl"];
it.each(ids)("connects both themes for machine variant %s", async (id) => {
  expect(await getExerciseMedia(id, "machine")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
});
it.each(ids)("preserves the contraction pause and supported knee axis for %s", (id) => {
  const dir = `tools/media/imports/all-remaining-20261116/knee-singles/native/${id}`;
  const poses = JSON.parse(readFileSync(`${dir}/poses.json`, "utf8"));
  expect(poses).toHaveLength(481);
  const start = 210;
  const end = 270;
  for (let f = start; f <= end; f++) expect(poses[f].joints).toEqual(poses[start].joints);
  for (const pose of poses) {
    expect(pose.joints["lowerleg01.L"]).toEqual(poses[0].joints["lowerleg01.L"]);
    expect(pose.joints.root).toEqual(poses[0].joints.root);
  }
  const checks = JSON.parse(readFileSync(`${dir}/kinematics.json`, "utf8"));
  expect(checks.status).toBe("numeric-checks-passed");
  if (id.startsWith("single")) { expect(checks.restFootDrift).toBe(0); for (const pose of poses) expect(pose.joints["foot.R"]).toEqual(poses[0].joints["foot.R"]); }
});
