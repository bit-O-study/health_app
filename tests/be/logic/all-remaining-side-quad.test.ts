import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "side-lying-quad-stretch";
it("connects the bodyweight quadriceps stretch as a hold", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("holds the upper ankle with a supported static posture", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/side-quad/native/${id}/kinematics.json`, "utf8"));
  expect(r.staticHold).toBe(true);
  expect(r.minKnee).toBeCloseTo(25);
  expect(Math.abs(r.thighAngle)).toBeLessThan(2);
  expect(r.ankleHandGap).toBeLessThan(0.02);
  expect(r.loopError).toBe(0);
  for (const gap of Object.values(r.supportGaps)) { expect(gap).toBeGreaterThan(0.01); expect(gap).toBeLessThan(0.04); }
});
