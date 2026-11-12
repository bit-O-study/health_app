import {describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:()=>{throw new Error("Expected built-in media");}}));
import {getExerciseMedia} from "@/features/exercises/exercise-media";
import {EXERCISES} from "@/features/routine/exercise-catalog";
describe("popular fifteenth batch",()=>{
 it("row setup matches the two-feet-grounded video variation",()=>{
  const method=EXERCISES["one-arm-dumbbell-row"].equipments.find(x=>x.equipment==="dumbbell")!.method!;
  expect(method.join(" ")).toContain("양발은 바닥");
  expect(method.join(" ")).not.toContain("한 무릎");
 });
 it.each(["bulgarian-split-squat","one-arm-dumbbell-row","cable-fly"])("serves the newly reviewed equipment-specific cycle for %s",async id=>{
  const equipment=id==="cable-fly"?"cable":"dumbbell";
  expect(await getExerciseMedia(id,equipment)).toMatchObject({kind:"video",equipmentIds:[equipment],url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
  expect(await getExerciseMedia(id,"barbell")).toBeNull();
  expect(await getExerciseMedia(id,"machine")).toBeNull();
  const provenance=JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`,"utf8"));
  expect(provenance.kinematics).toMatchObject({poseSamples:481,loop:0});
  expect(provenance.inputs.some((x:{path:string})=>x.path.includes("popular-three-b15-20261110"))).toBe(true);
 });
});
