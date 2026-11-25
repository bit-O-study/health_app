import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects close grip incline press to both barbell video themes", async () => {
  expect(await getExerciseMedia("close-grip-incline-press", "barbell")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/close-grip-incline-press.mp4"), darkUrl: expect.stringContaining("close-grip-incline-press-dark.mp4") });
  expect(await getExerciseMedia("close-grip-incline-press", "dumbbell")).toBeNull();
});
it("preserves the narrow grip, bench support and controlled wrist alignment", () => {
  const report = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/close-incline/native/close-grip-incline-press/kinematics.json", "utf8"));
  expect(report.gripError).toBeLessThan(1e-7);
  expect(report.gripSpan).toBe(4);
  expect(report.supportDrift).toBeLessThan(1e-7);
  expect(report.elbowRange[1]).toBeGreaterThan(155);
  expect(report.maxWristDeviation).toBeLessThan(35);
  expect(report.minimumNonChestClearance).toBeGreaterThan(0);
});
