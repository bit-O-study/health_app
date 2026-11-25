import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for(const id of ["upward-facing-dog"]){
 it(`${id} connects both themes only for bodyweight`, async () => {
  expect(await getExerciseMedia(id,"bodyweight")).toMatchObject({kind:"video",url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
  expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`,"utf8")).timing).toBe("hold");
 });
 it(`${id} supports a lifted chest with straight arms and thighs off floor`,()=>{
  const r=JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/upward-dog/native/${id}/kinematics.json`,"utf8"));
  expect(r.kneeMinimum).toBeGreaterThan(179);expect(r.elbowMinimum).toBeGreaterThan(179);expect(r.shouldersStacked).toBe(true);expect(r.thighsLifted).toBe(true);expect(r.kneeGap).toBeGreaterThan(.5);expect(r.clothGap).toBeGreaterThan(.2);expect(r.palmGap).toBeCloseTo(.015);expect(r.headGap).toBeGreaterThan(6);expect(r.footGap).toBeCloseTo(.015);expect(r.staticHold).toBe(true);expect(r.loopError).toBe(0);
 });
}
