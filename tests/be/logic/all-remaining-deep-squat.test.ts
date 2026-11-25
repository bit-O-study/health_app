import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects both bodyweight deep squat themes", async () => {
  expect(await getExerciseMedia("deep-squat-hold", "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/deep-squat-hold.mp4"), darkUrl: expect.stringContaining("deep-squat-hold-dark.mp4") });
  expect(await getExerciseMedia("deep-squat-hold", "dumbbell")).toBeNull();
});
it("keeps an unloaded static position below knee level", () => {
  const dir = "tools/media/imports/all-remaining-20261116/deep-squat/native/deep-squat-hold";
  const report = JSON.parse(readFileSync(`${dir}/kinematics.json`, "utf8"));
  expect(report.holdSeconds).toBe(8);
  expect(report.hipBelowKnee.every((x: number) => x > .5)).toBe(true);
  const geometry = JSON.parse(readFileSync(`${dir}/geometry.json`, "utf8"));
  expect(geometry.every((x: { equipmentVisible: boolean }) => !x.equipmentVisible)).toBe(true);
});
