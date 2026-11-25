import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id="planche";
it("connects full planche in both themes only for bodyweight", async () => {
 expect(await getExerciseMedia(id,"bodyweight")).toMatchObject({kind:"video",url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
 expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
 expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`,"utf8")).timing).toBe("hold");
});
it("holds horizontal straight legs above the floor on straight arms",()=>{
 const r=JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/planche/native/${id}/kinematics.json`,"utf8"));
 expect(r.kneeDegrees.L).toBeCloseTo(180);expect(r.kneeDegrees.R).toBeCloseTo(180);expect(r.legElevationDegrees).toBe(0);expect(r.shouldersAheadOfHands).toBe(true);expect(r.supportGaps.garment).toBeGreaterThan(3);expect(r.supportGaps.body).toBeCloseTo(.015);expect(r.staticHold).toBe(true);expect(r.loopError).toBe(0);
});
