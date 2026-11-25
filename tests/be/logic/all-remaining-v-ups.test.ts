import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["v-up", "v-up-2", "jackknife-sit-up"]) {
 it(`${id} connects both video themes only for bodyweight`, async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("continuous");
 });
 it(`${id} raises straight legs and torso together with continuous return`, () => {
  const root=`tools/media/imports/all-remaining-20261116/v-ups/native/${id}`;
  const r=JSON.parse(readFileSync(`${root}/kinematics.json`, "utf8"));
  expect(r.kneeMinimum).toBeGreaterThan(179);expect(r.legElevationRange[0]).toBeCloseTo(5);expect(r.legElevationRange[1]).toBeCloseTo(45);expect(r.maxFrameStep).toBeLessThan(.2);expect(r.loopError).toBe(0);
  const p=JSON.parse(readFileSync(`${root}/poses.json`, "utf8"));
  expect(p[240].joints.head[1]).toBeGreaterThan(p[0].joints.head[1]+2);
  expect(p[0].joints['wrist.L'][2]).toBeLessThan(p[0].joints.head[2]);
  expect(p[240].joints['wrist.L'][2]).toBeGreaterThan(p[240].joints.head[2]+3);
 });
}
