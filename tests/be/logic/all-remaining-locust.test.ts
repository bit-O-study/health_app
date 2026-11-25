import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "locust-pose";
it("connects locust hold with bodyweight equipment in both themes", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  const guide = JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8"));
  expect(guide.timing).toBe("hold");
});
it("maintains straight arms and legs above the mat with pelvis support", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/locust/native/${id}/kinematics.json`, "utf8"));
  expect(r.staticHold).toBe(true);
  expect(r.armsReachBackward).toBe(true);
  expect(r.minElbow).toBeGreaterThan(179.999);
  expect(r.minKnee).toBeGreaterThan(179.999);
  expect(r.minimumBodyGap).toBeGreaterThan(0.1);
  expect(r.minimumClothGap).toBeCloseTo(0.015);
  expect(r.minimumToeGap).toBeGreaterThan(1.5);
});
