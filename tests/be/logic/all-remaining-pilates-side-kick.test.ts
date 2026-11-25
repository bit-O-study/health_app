import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "pilates-side-kick";
it("connects Pilates side kick in both themes",async()=>{
 expect(await getExerciseMedia(id,"bodyweight")).toMatchObject({kind:"video",url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
 expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
 expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`,"utf8")).timing).toBe("continuous");
});
it("sweeps the straight leg at hip height with a stable torso",()=>{
 const r=JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/pilates-side-kick/native/${id}/kinematics.json`,"utf8"));
 expect(r.kneeDegrees[0]).toBeCloseTo(180);expect(r.torsoDrift).toBeLessThan(.01);expect(r.zSpan).toBeGreaterThan(9);expect(r.heightDrift).toBeLessThan(.01);expect(Math.max(...r.headHandGaps)).toBeLessThan(.05);expect(r.maxStep).toBeLessThan(.15);expect(r.loopError).toBe(0);
});
