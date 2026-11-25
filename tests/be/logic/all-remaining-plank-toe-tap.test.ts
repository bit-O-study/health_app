import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects both lateral toe-tap themes", async () => {
  expect(await getExerciseMedia("plank-toe-tap", "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/plank-toe-tap.mp4"), darkUrl: expect.stringContaining("plank-toe-tap-dark.mp4") });
  expect(await getExerciseMedia("plank-toe-tap", "plate")).toBeNull();
});
it("alternates lateral foot travel without moving the pelvis or arms", () => {
  const report = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/plank-toe-tap/native/plank-toe-tap/kinematics.json", "utf8"));
  expect(report.maxFixedError).toBeLessThan(1e-10);
  expect(report.lateralTravel.every((x: number) => x > 2 && x < 2.5)).toBe(true);
});
