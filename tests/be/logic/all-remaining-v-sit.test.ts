import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "v-sit-hold";
it("connects V sit hold in both themes",async()=>{
 expect(await getExerciseMedia(id,"bodyweight")).toMatchObject({kind:"video",url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
 expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
 expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`,"utf8")).timing).toBe("hold");
});
it("holds straight legs at 45 degrees with seated support",()=>{
 const r=JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/v-sit/native/${id}/kinematics.json`,"utf8"));
 expect(r.kneeDegrees.L).toBeCloseTo(180);expect(r.kneeDegrees.R).toBeCloseTo(180);expect(r.legElevationDegrees).toBe(45);expect(r.staticHold).toBe(true);expect(r.supportGaps.garment).toBeCloseTo(.015);expect(r.loopError).toBe(0);
});
