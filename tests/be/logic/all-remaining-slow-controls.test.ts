import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const cases = [{ id: "tempo-overhead-press", equipment: "barbell" as const, start: 180, end: 240 }, { id: "eccentric-nordic-curl", equipment: "bodyweight" as const, start: 300, end: 360 }];
it.each(cases)("connects both themes for $id with matching equipment", async ({ id, equipment }) => {
  expect(await getExerciseMedia(id, equipment)).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
});
it.each(cases)("keeps supports fixed and the prescribed pause for $id", ({ id, start, end }) => {
  const dir = `tools/media/imports/all-remaining-20261116/slow-controls/native/${id}`;
  const poses = JSON.parse(readFileSync(`${dir}/poses.json`, "utf8"));
  expect(poses).toHaveLength(481);
  for (let frame = start; frame <= end; frame++) expect(poses[frame].joints).toEqual(poses[start].joints);
  const checks = JSON.parse(readFileSync(`${dir}/kinematics.json`, "utf8"));
  expect(checks.status).toBe("numeric-checks-passed");
  expect(checks.supportDrift).toBeLessThan(1e-5);
  expect(poses[0].joints).toEqual(poses[480].joints);
});
