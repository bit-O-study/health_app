import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "low-lunge-stretch";
it("connects low lunge hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("keeps front knee above ankle and rear knee and feet grounded", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/low-lunge/native/low-lunge-stretch/kinematics.json','utf8'));
 expect(r.staticHold).toBe(true);expect(r.kneeDegrees.L).toBeGreaterThan(80);expect(r.kneeDegrees.L).toBeLessThan(90);expect(r.kneeDegrees.R).toBeGreaterThan(105);expect(r.kneeDegrees.R).toBeLessThan(115);
 for(const gap of [...r.supportGaps.feet,r.supportGaps.knee]){expect(gap).toBeGreaterThan(0);expect(gap).toBeLessThan(.07);}
});
