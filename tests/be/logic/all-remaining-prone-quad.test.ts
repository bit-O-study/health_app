import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "lying-quad-stretch";
it("connects prone quadriceps hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("holds the ankle with a flexed knee and supports head, torso and opposite foot", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/prone-quad/native/${id}/kinematics.json`, "utf8"));
  expect(r.staticHold).toBe(true);
  expect(r.kneeDegrees.L).toBeCloseTo(25);
  expect(r.kneeDegrees.R).toBeGreaterThan(175);
  expect(r.handAnkleGap).toBeLessThan(0.02);
  expect(r.clothFloorClearance).toBeGreaterThanOrEqual(0);
  for (const gap of Object.values(r.supportGaps)) {
    expect(gap).toBeGreaterThan(0.01);
    expect(gap).toBeLessThan(0.04);
  }
});
