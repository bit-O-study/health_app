import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "front-split-stretch";
it("connects front split hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("keeps both legs straight with supported pelvis and palms", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/front-split/native/front-split-stretch/kinematics.json','utf8'));
 expect(r.staticHold).toBe(true);expect(r.kneeDegrees.L).toBeCloseTo(180);expect(r.kneeDegrees.R).toBeCloseTo(180);
 expect(r.supportGaps.seat).toBeCloseTo(.015);expect(r.supportGaps.palms).toBeGreaterThan(.01);expect(r.supportGaps.palms).toBeLessThan(.08);
});
