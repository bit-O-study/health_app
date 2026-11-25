import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "triangle-pose";
it("connects triangle hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("keeps both feet grounded, straight knees and hand on shin", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/triangle/native/triangle-pose/kinematics.json','utf8'));
 expect(r.staticHold).toBe(true);expect(r.kneeDegrees.L).toBeGreaterThan(179);expect(r.kneeDegrees.R).toBeGreaterThan(179);
 expect(r.supportGaps.feet[0]).toBeCloseTo(.015);expect(r.supportGaps.feet[1]).toBeCloseTo(.015);expect(r.supportGaps.handShin).toBeLessThan(.03);
});
