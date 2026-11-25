import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id="pigeon-pose";
it("connects supported pigeon in both themes only for bodyweight", async () => {
 expect(await getExerciseMedia(id,"bodyweight")).toMatchObject({kind:"video",url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
 expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
 expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`,"utf8")).timing).toBe("hold");
});
it("keeps the front shin folded across and the rear leg straight",()=>{const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/pigeon/native/pigeon-pose/kinematics.json','utf8'));expect(r.kneeDegrees.L).toBeGreaterThan(35);expect(r.kneeDegrees.L).toBeLessThan(55);expect(r.kneeDegrees.R).toBeGreaterThan(179);expect(r.frontShinAcross).toBe(true);expect(r.torsoUpright).toBe(true);expect(r.staticHold).toBe(true);expect(r.loopError).toBe(0);});
