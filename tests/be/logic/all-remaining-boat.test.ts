import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "boat-pose";
it("connects boat hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("holds a V balance with straight 45-degree legs and horizontal arms", () => {
  const r = JSON.parse(readFileSync('tools/media/imports/all-remaining-20261116/boat/native/boat-pose/kinematics.json', 'utf8'));
  expect(r.staticHold).toBe(true);
  expect(r.kneeDegrees.L).toBeGreaterThan(179.99);
  expect(r.kneeDegrees.R).toBeGreaterThan(179.99);
  expect(r.legElevationDegrees).toBe(45);
  expect(r.armsHorizontal).toBe(true);
  expect(r.supportGaps.garment).toBeCloseTo(.015);
  expect(r.supportGaps.body).toBeGreaterThan(0);
  expect(r.supportGaps.body).toBeLessThan(.3);
});
