import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "side-lying-external-rotation";
it("connects side lying external rotation with dumbbell equipment", async () => {
  expect(await getExerciseMedia(id, "dumbbell")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).equipment).toBe("dumbbell");
});
it("rotates the forearm while keeping the upper arm stationary", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/side-rotation/native/${id}/kinematics.json`, "utf8"));
  expect(r.stationaryUpperArm).toBe(true);
  expect(r.stationaryLegs).toBe(true);
  expect(r.minActiveElbow).toBeCloseTo(90);
  expect(r.maxActiveElbow).toBeCloseTo(90);
  expect(r.minRotation).toBeCloseTo(0);
  expect(r.maxRotation).toBeCloseTo(60);
  expect(r.maxStep).toBeLessThan(0.04);
  expect(r.minimumWeightBodyGap).toBeGreaterThan(0.02);
  expect(r.minimumWeightFloorGap).toBeGreaterThan(3);
  for (const gap of Object.values(r.supportGaps)) { expect(gap).toBeGreaterThan(0.01); expect(gap).toBeLessThan(0.04); }
});
