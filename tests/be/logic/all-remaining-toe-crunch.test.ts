import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id="toe-touch-crunch";
it("connects vertical leg toe crunch in both themes only for bodyweight", async () => {
 expect(await getExerciseMedia(id,"bodyweight")).toMatchObject({kind:"video",url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
 expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
 expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`,"utf8")).timing).toBe("continuous");
});
it("curls the upper torso while keeping raised legs straight and vertical",()=>{
 const r=JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/toe-crunch/native/${id}/kinematics.json`,"utf8"));
 expect(r.kneeMinimum).toBeGreaterThan(179);expect(r.verticalLegs).toBe(true);expect(r.legDrift).toBeLessThan(.1);expect(r.headRise).toBeGreaterThan(2);expect(r.shoulderRise).toBeGreaterThan(.2);expect(r.maxStep).toBeLessThan(.1);expect(r.loopError).toBe(0);
});
