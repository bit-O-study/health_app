import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects both plate-loaded plank themes", async () => {
  expect(await getExerciseMedia("weighted-plank", "plate")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/weighted-plank.mp4"), darkUrl: expect.stringContaining("weighted-plank-dark.mp4") });
  expect(await getExerciseMedia("weighted-plank", "bodyweight")).toBeNull();
});
it("keeps the plate in contact with the back throughout the hold", () => {
  const report = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/weighted-plank/native/weighted-plank/kinematics.json", "utf8"));
  expect(report.holdSeconds).toBe(8);
  expect(report.plateContact).toBeCloseTo(.015, 10);
  expect(report.contactRadius).toBeLessThan(1.1);
  expect(report.support.slice(0, 4).every((x: number) => x >= 0 && x < .04)).toBe(true);
});
