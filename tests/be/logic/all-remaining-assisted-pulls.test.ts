import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
const ids = ["assisted-pull-up", "assisted-pull-up-2"];
it.each(ids)("connects both themes for assisted machine %s", async (id) => {
  expect(await getExerciseMedia(id, "machine")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
});
it.each(ids)("keeps knees supported and counterweight opposing the ascent for %s", (id) => {
  const dir = `tools/media/imports/all-remaining-20261116/assisted-pulls/native/${id}`;
  const checks = JSON.parse(readFileSync(`${dir}/kinematics.json`, "utf8"));
  expect(checks.status).toBe("numeric-checks-passed");
  expect(checks.supportDrift).toBeLessThan(1e-6);
  expect(checks.padTravel).toBeCloseTo(-checks.counterweightTravel);
  expect(checks.gripError).toBeLessThan(1e-6);
});
it("uses the same reviewed instructions for the duplicate machine entry", () => {
  expect(methodSteps("assisted-pull-up-2", "machine")).toEqual(methodSteps("assisted-pull-up", "machine"));
});
