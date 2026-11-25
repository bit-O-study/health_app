import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "pilates-hundred";
it("connects Pilates hundred in both themes",async()=>{
 expect(await getExerciseMedia(id,"bodyweight")).toMatchObject({kind:"video",url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
 expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
 expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`,"utf8")).timing).toBe("continuous");
});
it("pulses arms ten times with legs and torso held steady",()=>{
 const r=JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/pilates-hundred/native/${id}/kinematics.json`,"utf8"));
 expect(r.kneeDegrees[0]).toBeCloseTo(180);expect(r.peaks).toBe(10);expect(r.torsoDrift).toBeLessThan(1e-6);expect(r.armTravel).toBeGreaterThan(.4);expect(r.armTravel).toBeLessThan(.7);expect(r.maxStep).toBeLessThan(.1);expect(r.loopError).toBe(0);
});
