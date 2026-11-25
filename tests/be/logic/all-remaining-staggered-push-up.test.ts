import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects staggered hand push-up themes for bodyweight only", async () => {
  expect(await getExerciseMedia("staggered-push-up", "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/staggered-push-up.mp4"), darkUrl: expect.stringContaining("staggered-push-up-dark.mp4") });
  expect(await getExerciseMedia("staggered-push-up", "plate")).toBeNull();
});
it("keeps staggered palms fixed through both elbow ranges", () => {
  const report = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/staggered-push-up/native/staggered-push-up/kinematics.json", "utf8"));
  expect(report.maxGripError).toBeLessThan(1e-10);
  expect(report.stagger).toBe(1);
  for (const side of ["L", "R"]) expect(report.elbows[side].top - report.elbows[side].bottom).toBeGreaterThan(30);
});
