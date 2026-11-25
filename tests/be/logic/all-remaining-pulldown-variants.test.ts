import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
const cases = [{ id: "v-bar-lat-pulldown", stroke: 5.1, span: 1.7 }, { id: "partial-pulldown", stroke: 2.15, span: 7.2 }];
it.each(cases)("connects both cable themes for $id", async ({ id }) => {
  expect(await getExerciseMedia(id, "cable")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
});
it.each(cases)("preserves distinct grip and travel for $id", ({ id, stroke, span }) => {
  const dir = `tools/media/imports/all-remaining-20261116/pulldown-variants/native/${id}`;
  const poses = JSON.parse(readFileSync(`${dir}/poses.json`, "utf8"));
  expect(poses[0].joints.grips[0][1] - poses[210].joints.grips[0][1]).toBeCloseTo(stroke);
  expect(poses[0].joints.grips[0][0] - poses[0].joints.grips[1][0]).toBeCloseTo(span);
});
it("explains the upper-half range instead of a full chest pull", () => {
  expect(methodSteps("partial-pulldown", "cable").join(" ")).toContain("위쪽 절반");
});
