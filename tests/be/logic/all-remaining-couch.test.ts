import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "couch-stretch";
it("connects couch stretch in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("supports rear foot on bench and rear knee on pad", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/couch/native/couch-stretch/kinematics.json','utf8'));
 expect(r.staticHold).toBe(true);expect(r.kneeDegrees.L).toBeGreaterThan(82);expect(r.kneeDegrees.R).toBeLessThan(27);
 expect(r.supportGaps.hands.every((v: number)=>v<.03)).toBe(true);expect(r.supportGaps.rearKneePad).toBeCloseTo(.015);expect(r.supportGaps.rearFootBench).toBeCloseTo(.015);expect(r.supportGaps.feet[0]).toBeCloseTo(.015);
});
