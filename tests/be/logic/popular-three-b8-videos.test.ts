import {describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:()=>{throw new Error("Expected built-in media");}}));
import {getExerciseMedia} from "@/features/exercises/exercise-media";
import {guideFor} from "@/features/workout-timer/exercise-guides";
import {getCatalogExercise} from "@/features/routine/exercise-catalog";
describe("shoulder and triceps eighth batch",()=>{
 it("matches the standing Arnold setup",()=>{
  expect(guideFor("arnold-press").setupSteps?.join(" ")).toContain("서서");
  expect(guideFor("arnold-press").setupSteps?.join(" ")).not.toContain("벤치");
 });
 it("matches the two-dumbbell overhead extension",()=>{
  const method=getCatalogExercise("overhead-triceps-extension")?.equipments.find(e=>e.equipment==="dumbbell")?.method?.join(" ");
  expect(method).toContain("각 손에 덤벨 하나씩");
  expect(guideFor("overhead-triceps-extension").setupSteps?.join(" ")).toContain("각 손에 덤벨 하나씩");
 });
 it.each(["arnold-press","overhead-triceps-extension","cable-lateral-raise"])("serves the newly reviewed equipment-specific cycle for %s",async id=>{
  const equipment=id==="cable-lateral-raise"?"cable":"dumbbell";
  expect(await getExerciseMedia(id,equipment)).toMatchObject({kind:"video",equipmentIds:[equipment],url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
  expect(await getExerciseMedia(id,"barbell")).toBeNull();
  expect(await getExerciseMedia(id,equipment==="dumbbell"?"cable":"dumbbell")).toBeNull();
  const provenance=JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`,"utf8"));
  expect(provenance.kinematics).toMatchObject({poseSamples:481,loop:0});
  expect(provenance.inputs.some((x:{path:string})=>x.path.includes("popular-three-b8-20261104"))).toBe(true);
 });
});
