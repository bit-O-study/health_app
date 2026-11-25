import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects both RKC plank themes with bodyweight equipment", async () => {
  expect(await getExerciseMedia("rkc-plank", "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/rkc-plank.mp4"), darkUrl: expect.stringContaining("rkc-plank-dark.mp4") });
  expect(await getExerciseMedia("rkc-plank", "plate")).toBeNull();
});
it("keeps close feet and forearm support throughout the static hold", () => {
  const report = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/rkc-plank/native/rkc-plank/kinematics.json", "utf8"));
  expect(report.holdSeconds).toBe(8);
  expect(report.support.slice(0, 4).every((v: number) => v >= 0 && v < .05)).toBe(true);
  expect(report.support[4]).toBeGreaterThanOrEqual(0);
  expect(report.feetGap).toBeLessThan(1);
});
