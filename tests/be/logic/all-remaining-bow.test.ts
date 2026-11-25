import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "bow-pose";
it("connects bow hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("holds both ankles with chest and knees elevated", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/bow/native/bow-pose/kinematics.json','utf8'));
 expect(r.staticHold).toBe(true);expect(r.kneeDegrees.L).toBeLessThan(60);expect(r.kneeDegrees.R).toBeLessThan(60);
 expect(r.supportGaps.hands.every((v: number)=>v<.02)).toBe(true);expect(r.supportGaps.knees.every((v: number)=>v>1)).toBe(true);expect(r.supportGaps.cloth).toBeCloseTo(.015);
});
