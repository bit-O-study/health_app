import {describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:()=>{throw new Error("Expected built-in media");}}));
import {getExerciseMedia} from "@/features/exercises/exercise-media";
describe("twelfth batch",()=>{
 it.each(["preacher-curl","rear-delt-fly","straight-arm-pulldown"])("serves the newly reviewed equipment-specific cycle for %s",async id=>{
  const equipment=id==="straight-arm-pulldown"?"cable":"dumbbell";
  expect(await getExerciseMedia(id,equipment)).toMatchObject({kind:"video",equipmentIds:[equipment],url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
  expect(await getExerciseMedia(id,"barbell")).toBeNull();
  expect(await getExerciseMedia(id,equipment==="dumbbell"?"cable":"dumbbell")).toBeNull();
  const provenance=JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`,"utf8"));
  expect(provenance.kinematics).toMatchObject({poseSamples:481,loop:0});
  expect(provenance.inputs.some((x:{path:string})=>x.path.includes("popular-three-b12-20261109"))).toBe(true);
 });
});
