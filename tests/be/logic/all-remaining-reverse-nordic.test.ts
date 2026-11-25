import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects both unloaded reverse Nordic themes", async () => {
  expect(await getExerciseMedia("reverse-nordic-curl", "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/reverse-nordic-curl.mp4"), darkUrl: expect.stringContaining("reverse-nordic-curl-dark.mp4") });
  expect(await getExerciseMedia("reverse-nordic-curl", "plate")).toBeNull();
});
it("keeps the lower legs fixed while the aligned upper body leans backward", () => {
  const report = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/reverse-nordic/native/reverse-nordic-curl/kinematics.json", "utf8"));
  expect(report.maxSupportError).toBeLessThan(1e-10);
  expect(report.maxAlignmentError).toBeLessThan(1e-10);
  expect(report.backwardHeadTravel).toBeGreaterThan(5);
});
