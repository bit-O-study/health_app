import {describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:()=>{throw new Error("Expected reviewed built-in media");}}));
import {getExerciseMedia} from "@/features/exercises/exercise-media";
import {methodSteps} from "@/features/routine/exercise-methods";
import {guideFor} from "@/features/workout-timer/exercise-guides";
describe("grip and axle deadlift demonstrations",()=>{
  it("distinguishes clean and snatch grips and initial leg drive",()=>{
    expect(guideFor("clean-grip-deadlift").setup).toContain("어깨");
    expect(guideFor("snatch-grip-deadlift").setup).toContain("넓게");
    for(const id of ["clean-grip-deadlift","snatch-grip-deadlift"]){
      expect(methodSteps(id,"barbell").join(" ")).toContain("등 각도");
      expect(guideFor(id).cues.join(" ")).toContain("캐치");
    }
  });
  it("identifies the thick double-overhand axle",()=>{
    expect(methodSteps("axle-bar-deadlift","barbell").join(" ")).toContain("굵은");
    expect(guideFor("axle-bar-deadlift").setup).toContain("오버핸드");
  });
  it.each(["clean-grip-deadlift","snatch-grip-deadlift","axle-bar-deadlift"])("selects reviewed barbell media for %s",async id=>{
    expect(await getExerciseMedia(id,"barbell")).toMatchObject({kind:"video",equipmentIds:["barbell"]});
    expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
  });
});
