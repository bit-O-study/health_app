import {describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:()=>{throw new Error("Expected built-in media");}}));
import {getExerciseMedia} from "@/features/exercises/exercise-media";
import {methodSteps} from "@/features/routine/exercise-methods";
import {guideFor} from "@/features/workout-timer/exercise-guides";
describe("Smith hinge demonstrations",()=>{
 it("starts conventional deadlift low",()=>{expect(guideFor("smith-machine-deadlift").cues.join(" ")).toContain("낮은 위치에서 상승");expect(methodSteps("smith-machine-deadlift","smith").join(" ")).toContain("스토퍼");});
 it("starts Romanian standing with constant knee bend",()=>{expect(guideFor("smith-machine-romanian-deadlift").cues.join(" ")).toContain("선 자세에서 하강");expect(methodSteps("smith-machine-romanian-deadlift","smith").join(" ")).toContain("무릎 각도");});
 it("distinguishes stiff legs without locking knees",()=>{expect(guideFor("smith-machine-stiff-leg-deadlift").setup).toContain("루마니안보다");expect(guideFor("smith-machine-stiff-leg-deadlift").cues.join(" ")).toContain("잠그지");});
 it.each(["smith-machine-deadlift","smith-machine-romanian-deadlift","smith-machine-stiff-leg-deadlift"])("selects Smith-only media for %s",async id=>{expect(await getExerciseMedia(id,"smith")).toMatchObject({kind:"video",equipmentIds:["smith"]});expect(await getExerciseMedia(id,"barbell")).toBeNull();});
});
