import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "pilates-single-leg-stretch";
it("connects Pilates single leg stretch in both themes",async()=>{
 expect(await getExerciseMedia(id,"bodyweight")).toMatchObject({kind:"video",url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
 expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
 expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`,"utf8")).timing).toBe("continuous");
});
it("alternates leg extension while keeping torso stable",()=>{
 const r=JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/pilates-single/native/${id}/kinematics.json`,"utf8"));
 expect(r.kneeDegrees[0]).toBeCloseTo(70);expect(r.kneeDegrees[1]).toBeCloseTo(180);expect(r.torsoDrift).toBeLessThan(.03);expect(r.maxHandWidth).toBeGreaterThan(3);expect(r.maxStep).toBeLessThan(.15);expect(r.loopError).toBe(0);
});
