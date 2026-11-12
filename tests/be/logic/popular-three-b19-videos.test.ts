import {describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:()=>{throw new Error("Expected built-in media");}}));
import {getExerciseMedia} from "@/features/exercises/exercise-media";
describe("nineteenth batch equipment mappings",()=>{
 it.each(["wide-grip-lat-pulldown","captain-s-chair-leg-raise","kettlebell-front-squat"])("serves the newly reviewed equipment-specific cycle for %s",async id=>{
  const equipment=id==="kettlebell-front-squat"?"kettlebell":id==="captain-s-chair-leg-raise"?"machine":"cable";
  expect(await getExerciseMedia(id,equipment)).toMatchObject({kind:"video",equipmentIds:[equipment],url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
  expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
  expect(await getExerciseMedia(id,"barbell")).toBeNull();
  const provenance=JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`,"utf8"));
  expect(provenance.kinematics).toMatchObject({poseSamples:481,loop:0});
  expect(provenance.inputs.some((x:{path:string})=>x.path.includes("popular-three-b19-20261110"))).toBe(true);
 });
});
