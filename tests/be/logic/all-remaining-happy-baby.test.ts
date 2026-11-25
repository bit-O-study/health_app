import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "happy-baby-pose";
it("connects happy baby hold in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
});
it("keeps widened knees below vertical shins and hands against the feet", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/happy-baby/native/${id}/kinematics.json`, "utf8"));
  expect(r.staticHold).toBe(true);
  expect(r.verticalShins).toBe(true);
  expect(r.kneeWidth).toBeGreaterThan(6);
  for (const gap of r.handFootGaps) expect(gap).toBeLessThan(0.04);
  for (const gap of Object.values(r.supportGaps)) {
    expect(gap).toBeGreaterThan(0.01);
    expect(gap).toBeLessThan(0.04);
  }
});
