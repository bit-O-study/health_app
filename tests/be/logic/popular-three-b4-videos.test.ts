import {describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:()=>{throw new Error("Expected built-in media");}}));
import {getExerciseMedia} from "@/features/exercises/exercise-media";
describe("popular exercise fourth batch",()=>{
 it.each([["ohp","barbell"],["seated-cable-row","cable"],["dips","bodyweight"]])("serves reviewed themes for %s with its equipment",async(id,equipment)=>{
  expect(await getExerciseMedia(id,equipment)).toMatchObject({kind:"video",equipmentIds:[equipment],url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
  expect(await getExerciseMedia(id,equipment==="bodyweight"?"barbell":"bodyweight")).toBeNull();
 });
});
