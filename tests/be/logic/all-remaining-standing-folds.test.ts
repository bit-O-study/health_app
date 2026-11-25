import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["standing-forward-fold", "wide-leg-forward-fold"]) {
 it(`connects ${id} in both themes`,async()=>{
  expect(await getExerciseMedia(id,"bodyweight")).toMatchObject({kind:"video",url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
  expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`,"utf8")).timing).toBe("hold");
 });
 it(`grounds feet and supports hands for ${id}`,()=>{
  const r=JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/standing-folds/native/${id}/kinematics.json`,"utf8"));
  expect(r.kneeDegrees.L).toBeCloseTo(180);expect(r.kneeDegrees.R).toBeCloseTo(180);expect(r.staticHold).toBe(true);expect(r.supportGaps.foot).toBeCloseTo(.015);expect(Math.max(...r.supportGaps.hands)).toBeCloseTo(.015);expect(r.loopError).toBe(0);
  if(id.startsWith("wide")) expect(r.footWidth).toBeGreaterThan(8);else expect(r.footWidth).toBeLessThan(3);
 });
}
