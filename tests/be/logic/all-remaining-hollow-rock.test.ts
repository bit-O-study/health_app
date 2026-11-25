import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id="hollow-rock";
it("connects hollow rock in both themes only for bodyweight", async () => {
 expect(await getExerciseMedia(id,"bodyweight")).toMatchObject({kind:"video",url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
 expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
 expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`,"utf8")).timing).toBe("continuous");
});
it("rocks with a constant body shape and straight raised legs",()=>{
 const r=JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/hollow-rock/native/${id}/kinematics.json`,"utf8"));
 expect(r.kneeMinimum).toBeGreaterThan(179);expect(r.shapeError).toBeLessThan(1e-8);expect(r.legElevation[0]).toBeCloseTo(12);expect(r.legElevation[1]).toBeCloseTo(28);expect(r.maxStep).toBeLessThan(.1);expect(r.loopError).toBe(0);
});
