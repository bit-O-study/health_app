import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const ids = ["pause-leg-extension", "top-half-leg-extension", "pause-leg-curl", "eccentric-leg-curl"];
it.each(ids)("connects both themes for machine variant %s", async (id) => {
  expect(await getExerciseMedia(id, "machine")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
});
it.each(ids)("preserves the contraction pause and supported knee axis for %s", (id) => {
  const dir = `tools/media/imports/all-remaining-20261116/knee-machines/native/${id}`;
  const poses = JSON.parse(readFileSync(`${dir}/poses.json`, "utf8"));
  expect(poses).toHaveLength(481);
  const start = id === "eccentric-leg-curl" ? 60 : 180;
  const end = id === "eccentric-leg-curl" ? 120 : 300;
  for (let f = start; f <= end; f++) expect(poses[f].joints).toEqual(poses[start].joints);
  for (const pose of poses) {
    expect(pose.joints["lowerleg01.L"]).toEqual(poses[0].joints["lowerleg01.L"]);
    expect(pose.joints.root).toEqual(poses[0].joints.root);
  }
  const checks = JSON.parse(readFileSync(`${dir}/kinematics.json`, "utf8"));
  expect(checks.status).toBe("numeric-checks-passed");
  if (id === "top-half-leg-extension") expect(checks.kneeDegrees[0]).toBeCloseTo(130);
});
