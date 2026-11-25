import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "lying-leg-raise";
it("connects the bodyweight leg raise in both themes", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("continuous");
});
it("keeps the torso supported through a straight-leg lowering cycle", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/lying-raise/native/${id}/kinematics.json`, "utf8"));
  expect(r.torsoStationary).toBe(true);
  expect(r.minLegAngle).toBeCloseTo(15);
  expect(r.maxLegAngle).toBeCloseTo(90);
  expect(r.minKnee).toBeGreaterThan(179.99);
  expect(r.maxStep).toBeLessThan(0.11);
  expect(r.loopError).toBe(0);
  for (const gap of Object.values(r.supportGaps)) { expect(gap).toBeGreaterThan(0.01); expect(gap).toBeLessThan(0.04); }
});
it("preserves Korean text in the exercise instructions", () => {
  for (const file of ["src/features/routine/exercise-methods.ts", "src/features/workout-timer/exercise-guides.ts"]) {
    const text = readFileSync(file, "utf8");
    expect(text).toContain("두 다리를 곧게");
    expect(text).not.toMatch(/"[^"\r\n]*\?\?[^"\r\n]*"/);
  }
});
