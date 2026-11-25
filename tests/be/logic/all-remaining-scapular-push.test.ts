import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id="scapular-push-up";
it("connects scapular push-up in both themes only for bodyweight", async () => {
 expect(await getExerciseMedia(id,"bodyweight")).toMatchObject({kind:"video",url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
 expect(await getExerciseMedia(id,"dumbbell")).toBeNull();
 expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`,"utf8")).timing).toBe("continuous");
});
it("raises the chest with straight arms and fixed hands and feet",()=>{
 const r=JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/scapular-push/native/${id}/kinematics.json`,"utf8"));
 expect(r.elbowRange[0]).toBeGreaterThan(178.9);expect(r.elbowRange[1]).toBeLessThan(179.1);expect(r.supportDrift).toBeLessThan(1e-6);expect(r.chestRise).toBeGreaterThan(.5);expect(r.maxStep).toBeLessThan(.03);expect(r.loopError).toBe(0);
});
