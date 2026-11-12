import {describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:()=>{throw new Error("Expected built-in media");}}));
import {getExerciseMedia} from "@/features/exercises/exercise-media";
const entries=[{"id":"pause-squat","equipment":"barbell"},{"id":"tempo-squat","equipment":"barbell"},{"id":"pause-front-squat","equipment":"barbell"},{"id":"tempo-front-squat","equipment":"barbell"},{"id":"wide-stance-squat","equipment":"barbell"},{"id":"close-stance-squat","equipment":"barbell"},{"id":"1-5-rep-squat","equipment":"barbell"},{"id":"eccentric-squat","equipment":"barbell"},{"id":"partial-squat","equipment":"barbell"},{"id":"bottom-half-squat","equipment":"barbell"},{"id":"pause-bulgarian-split-squat","equipment":"dumbbell"},{"id":"tempo-bulgarian-split-squat","equipment":"dumbbell"},{"id":"pause-goblet-squat","equipment":"dumbbell"},{"id":"double-kettlebell-press","equipment":"kettlebell"},{"id":"dumbbell-front-squat","equipment":"dumbbell"}];
describe("hundred batch first fifteen reviewed mappings",()=>{
 it.each(entries)("serves the reviewed cycle for $id",async ({id,equipment})=>{
  expect(await getExerciseMedia(id,equipment)).toMatchObject({kind:"video",equipmentIds:[equipment],url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
  expect(await getExerciseMedia(id,"machine")).toBeNull();
  const provenance=JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`,"utf8"));
  expect(provenance.kinematics).toMatchObject({poseSamples:481,loop:0});
  expect(provenance.inputs.some((x:{path:string})=>x.path.includes("hundred-20261111"))).toBe(true);
 });
});