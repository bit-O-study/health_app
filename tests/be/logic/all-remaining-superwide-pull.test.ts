import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const cases = [{ id: "super-wide-grip-pulldown", span: 9.6 }];
it.each(cases)("connects both cable demonstration themes for $id", async ({ id }) => {
  expect(await getExerciseMedia(id, "cable")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
});
it.each(cases)("preserves the correct wide bar grip and supports for $id", ({ id, span }) => {
  const dir = `tools/media/imports/all-remaining-20261116/superwide-pull/native/${id}`;
  const checks = JSON.parse(readFileSync(`${dir}/kinematics.json`, "utf8"));
  expect(checks.status).toBe("numeric-checks-passed");
  expect(checks.handleSpan).toBeCloseTo(span);
  const geometry = JSON.parse(readFileSync(`${dir}/geometry.json`, "utf8"));
  for (const sample of geometry) {
    expect(Math.abs(sample.footGap)).toBeLessThan(1e-6);
    expect(Math.abs(sample.seatContactGap)).toBeLessThan(1e-6);
  }
});
