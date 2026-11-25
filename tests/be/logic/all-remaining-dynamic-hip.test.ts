import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "dynamic-hip-flexor-stretch";
it("connects dynamic hip stretch for bodyweight in both themes", async () => {
 expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({kind:"video",url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
 expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
 expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`,"utf8")).timing).toBe("continuous");
});
it("keeps foot and knee supports fixed through a smooth forward shift",()=>{
 const r=JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/dynamic-hip/native/${id}/kinematics.json`,"utf8"));
 expect(r.supportDrift).toBeLessThan(1e-10);expect(r.maxStep).toBeLessThan(.03);expect(r.hipTravel).toBeGreaterThan(1);expect(r.loopError).toBe(0);
 expect(r.rearKneeFloorGaps.every((x:number)=>x>.01&&x<.06)).toBe(true);
});
