import {describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:()=>{throw new Error("Expected built-in media");}}));
import {getExerciseMedia} from "@/features/exercises/exercise-media";
import {guideFor} from "@/features/workout-timer/exercise-guides";
describe("concentration curl and cable pulls ninth batch",()=>{
 it("describes the face pull with hands separating outside the face",()=>{
  const tips=guideFor("face-pull").proTips?.join(" ");
  expect(tips).toContain("양손을 얼굴 바깥으로");
  expect(tips).not.toContain("팔꿈치를 손보다 높게");
 });
 it.each(["concentration-curl","face-pull","cable-upright-row"])("serves the newly reviewed equipment-specific cycle for %s",async id=>{
  const equipment=id==="concentration-curl"?"dumbbell":"cable";
  expect(await getExerciseMedia(id,equipment)).toMatchObject({kind:"video",equipmentIds:[equipment],url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
  expect(await getExerciseMedia(id,"barbell")).toBeNull();
  expect(await getExerciseMedia(id,equipment==="dumbbell"?"cable":"dumbbell")).toBeNull();
  const provenance=JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`,"utf8"));
  expect(provenance.kinematics).toMatchObject({poseSamples:481,loop:0});
  expect(provenance.inputs.some((x:{path:string})=>x.path.includes("popular-three-b9-20261104"))).toBe(true);
 });
});
