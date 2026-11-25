import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects both bodyweight bear plank themes", async () => {
  expect(await getExerciseMedia("bear-plank", "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/bear-plank.mp4"), darkUrl: expect.stringContaining("bear-plank-dark.mp4") });
  expect(await getExerciseMedia("bear-plank", "plate")).toBeNull();
});
it("supports hands and toes while knees hover", () => {
  const report = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/bear-plank/native/bear-plank/kinematics.json", "utf8"));
  expect(report.holdSeconds).toBe(8);
  expect(report.handGap).toBeLessThan(.04);
  expect(report.toeGap).toBeLessThan(.04);
  expect(report.kneeHover.every((v: number) => v > .3 && v < .8)).toBe(true);
});
