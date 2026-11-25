import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["pilates-criss-cross", "bicycle-crunch"]) {
 it(`${id} connects both themes only for bodyweight`, async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("continuous");
 });
 it(`${id} alternates opposite shoulder rotation with stable pelvis and supported head`, () => {
  const r=JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/criss-cross/native/${id}/kinematics.json`, "utf8"));
  expect(r.kneeRange[0]).toBeCloseTo(90);expect(r.kneeRange[1]).toBeGreaterThan(179);
  expect(r.levelFeet).toBe(true);expect(r.oppositeShoulderRotation).toBe(true);
  expect(r.pelvisDrift).toBeLessThan(.15);expect(r.maximumHandHeadGap).toBeLessThan(.06);expect(r.maxStep).toBeLessThan(.1);expect(r.loopError).toBe(0);
 });
}
