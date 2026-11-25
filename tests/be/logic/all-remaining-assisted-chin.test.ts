import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";

const ids = ["assisted-chin-up"];
it.each(ids)("connects both themes for assisted machine %s", async (id) => {
  expect(await getExerciseMedia(id, "machine")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
});
it.each(ids)("keeps knees supported and counterweight opposing the ascent for %s", (id) => {
  const dir = `tools/media/imports/all-remaining-20261116/assisted-chin/native/${id}`;
  const checks = JSON.parse(readFileSync(`${dir}/kinematics.json`, "utf8"));
  expect(checks.status).toBe("numeric-checks-passed");
  expect(checks.supportDrift).toBeLessThan(1e-6);
  expect(checks.padTravel).toBeCloseTo(-checks.counterweightTravel);
  expect(checks.gripError).toBeLessThan(1e-6);
  const poses = JSON.parse(readFileSync(`${dir}/poses.json`, "utf8"));
  for (const pose of poses) { expect(pose.joints.handAxes[0][0]).toBeGreaterThan(.98); expect(pose.joints.handAxes[1][0]).toBeLessThan(-.98); }
});
