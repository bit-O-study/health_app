import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "tree-pose";
it("connects tree hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("keeps standing foot grounded and raised foot on thigh above knee", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/tree/native/tree-pose/kinematics.json','utf8'));
 expect(r.staticHold).toBe(true);expect(r.kneeDegrees.L).toBeGreaterThan(179);expect(r.kneeDegrees.R).toBeLessThan(30);
 expect(r.supportGaps.feet[0]).toBeCloseTo(.015);expect(r.supportGaps.feet[1]).toBeGreaterThan(5);expect(r.supportGaps.raisedFootThigh).toBeLessThan(.02);
});
