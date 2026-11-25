import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
it.each(["1-5-rep-leg-press", "partial-leg-press"])("connects both machine themes for %s", async id => {
  expect(await getExerciseMedia(id, "machine")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
});
it("distinguishes the extra half repetition from the partial range", () => {
  const read = (id: string) => JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/leg-press-variants/native/${id}/kinematics.json`, "utf8"));
  expect(read("1-5-rep-leg-press").timingTargets.map((x: number[]) => x[1])).toEqual([165, 95, 130, 95, 165, 165]);
  expect(read("partial-leg-press").kneeDegrees[0]).toBeCloseTo(130);
  expect(methodSteps("1-5-rep-leg-press", "machine").join(" ")).toContain("절반만");
  expect(methodSteps("partial-leg-press", "machine").join(" ")).toContain("위쪽 절반");
});
