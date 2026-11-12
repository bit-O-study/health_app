import {describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:()=>{throw new Error("Expected built-in media");}}));
import {getExerciseMedia,selectExerciseMedia} from "@/features/exercises/exercise-media";
describe("barbell thirteenth batch",()=>{
 it.each(["incline-press","upright-row","wrist-curl"])("serves the newly reviewed equipment-specific cycle for %s",async id=>{
  const equipment="barbell";
  expect(await getExerciseMedia(id,equipment)).toMatchObject({kind:"video",equipmentIds:[equipment],url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
  if(id!=="upright-row")expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
  else {
   expect(await getExerciseMedia(id,"dumbbell")).toMatchObject({kind:"video",equipmentIds:["dumbbell"]});
   const barbell=await getExerciseMedia(id,"barbell");
   expect(selectExerciseMedia(barbell,"dumbbell")).toMatchObject({equipmentIds:["dumbbell"]});
   expect(selectExerciseMedia({...barbell!,url:"/custom-video.mp4"},"dumbbell")).toBeNull();
  }
  expect(await getExerciseMedia(id,"cable")).toBeNull();
  const provenance=JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`,"utf8"));
  expect(provenance.kinematics).toMatchObject({poseSamples:481,loop:0});
  expect(provenance.inputs.some((x:{path:string})=>x.path.includes("popular-three-b13-20261109"))).toBe(true);
 });
});
