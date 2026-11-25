import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "lying-hamstring-stretch";
it("connects the supine hamstring hold in both themes", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("holds behind the straight raised thigh with head, back and opposite heel supported", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/lying-hamstring/native/${id}/kinematics.json`, "utf8"));
  expect(r.staticHold).toBe(true);
  expect(r.raisedKneeDegrees).toBeGreaterThan(179.999);
  expect(r.kneeTowardChest).toBeGreaterThan(0.7);
  expect(r.handHandGap).toBeGreaterThan(0.1);
  for (const gap of r.handThighGaps) expect(gap).toBeLessThan(0.04);
  for (const gap of Object.values(r.supportGaps)) {
    expect(gap).toBeGreaterThan(0.01);
    expect(gap).toBeLessThan(0.04);
  }
});
