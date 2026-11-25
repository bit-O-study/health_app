import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "pilates-swan";
it("connects Pilates swan in both themes",async()=>{
 expect(await getExerciseMedia(id,"bodyweight")).toMatchObject({kind:"video",url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
 expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
 expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`,"utf8")).timing).toBe("continuous");
});
it("raises head and straight legs together with a continuous return",()=>{
 const r=JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/pilates-swan/native/${id}/kinematics.json`,"utf8"));
 expect(r.kneeDegrees[0]).toBeCloseTo(180);expect(r.headRise).toBeGreaterThan(.5);expect(r.footRise).toBeGreaterThan(1);expect(r.maxStep).toBeLessThan(.1);expect(r.loopError).toBe(0);
});
