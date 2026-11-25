import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "boat-to-low-boat";
it("connects high to low boat cycle in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("continuous");
});
it("lowers and returns with straight legs, raised shoulders and feet", () => {
 const r=JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/low-boat/native/boat-to-low-boat/kinematics.json','utf8'));
 expect(r.loopError).toBe(0);
 expect(r.kneeMinimum).toBeGreaterThan(179.99);
 expect(r.legElevationRange[0]).toBeCloseTo(15);
 expect(r.legElevationRange[1]).toBeCloseTo(45);
 expect(r.maxFrameStep).toBeLessThan(.1);
 expect(r.minimumFootGap).toBeGreaterThan(2.5);
 expect(r.minimumShoulderGap).toBeGreaterThan(1.1);
});
