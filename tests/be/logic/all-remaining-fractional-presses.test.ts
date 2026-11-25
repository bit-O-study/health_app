import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
const cases = [{ id: "1-25-rep-bench-press", fractions: [1, 0, .25, 0, 1, 1], cue: "4분의 1" }, { id: "1-5-rep-shoulder-press", fractions: [0, .5, 0, 1, 0], cue: "절반 높이" }];
it.each(cases)("connects both barbell themes for $id", async ({ id }) => {
  expect(await getExerciseMedia(id, "barbell")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "machine")).toBeNull();
});
it.each(cases)("keeps fractional repetition guidance consistent for $id", ({ id, fractions, cue }) => {
  const report = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/fractional-presses/native/${id}/kinematics.json`, "utf8"));
  expect(report.status).toBe("numeric-checks-passed");
  expect(report.fractions).toEqual(fractions);
  expect(methodSteps(id, "barbell").join(" ")).toContain(cue);
});
