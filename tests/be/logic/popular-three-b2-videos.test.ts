import {describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:()=>{throw new Error("Expected built-in media");}}));
import {getExerciseMedia} from "@/features/exercises/exercise-media";
describe("popular exercise second batch",()=>{
 it.each(["pull-up","lat-pulldown","leg-press"])("serves both reviewed themes for %s",async id=>{
  const equipment=id==="pull-up"?"bodyweight":"machine";
  expect(await getExerciseMedia(id,equipment)).toMatchObject({kind:"video",equipmentIds:[equipment],url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
  expect(await getExerciseMedia(id,"barbell")).toBeNull();
 });
});
