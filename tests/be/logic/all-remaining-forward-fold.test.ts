import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "seated-forward-fold";
it("connects seated forward fold hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("keeps straight parallel legs, toes up, and supports palms, heels and seated pelvis", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/forward-fold/native/${id}/kinematics.json`, "utf8"));
  expect(r.staticHold).toBe(true);
  expect(r.kneeDegrees.L).toBeGreaterThan(179.99);
  expect(r.kneeDegrees.R).toBeGreaterThan(179.99);
  expect(r.footWidth).toBeCloseTo(2.1953);
  for (const gap of Object.values(r.supportGaps)) {
    expect(gap).toBeGreaterThan(0.01);
    expect(gap).toBeLessThan(0.04);
  }
});
