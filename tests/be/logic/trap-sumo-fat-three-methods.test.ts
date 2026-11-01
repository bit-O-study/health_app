import {describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:()=>{throw new Error("Expected built-in media");}}));
import {getExerciseMedia} from "@/features/exercises/exercise-media";
import {methodSteps} from "@/features/routine/exercise-methods";
import {guideFor} from "@/features/workout-timer/exercise-guides";
describe("trap, sumo and fat grip demonstrations",()=>{
 it("explains neutral handles inside the trap bar",()=>{expect(guideFor("trap-bar-deadlift").setup).toContain("중립 그립");expect(methodSteps("trap-bar-deadlift","barbell").join(" ")).toContain("안쪽");});
 it("uses one centered kettlebell in a wide stance",()=>{expect(guideFor("kettlebell-sumo-deadlift").setup).toContain("하나");expect(methodSteps("kettlebell-sumo-deadlift","kettlebell").join(" ")).toContain("넓은");});
 it("distinguishes grip adapters from a thick axle",()=>{expect(guideFor("fat-grip-deadlift").cues.join(" ")).toContain("손잡이 부분만");expect(methodSteps("fat-grip-deadlift","barbell").join(" ")).toContain("어댑터");});
 it.each([["trap-bar-deadlift","barbell"],["kettlebell-sumo-deadlift","kettlebell"],["fat-grip-deadlift","barbell"]])("selects equipment-specific reviewed media for %s",async(id,equipment)=>{expect(await getExerciseMedia(id,equipment)).toMatchObject({kind:"video",equipmentIds:[equipment]});expect(await getExerciseMedia(id,"dumbbell")).toBeNull();});
});
