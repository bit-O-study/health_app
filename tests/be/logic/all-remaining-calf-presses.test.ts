import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
it.each(["calf-press-machine", "pause-calf-raise"])("connects both machine themes for %s", async id => {
  expect(await getExerciseMedia(id, "machine")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "barbell")).toBeNull();
});
it("checks supported forefeet and the two-second top pause", () => {
  const dir = "tools/media/imports/all-remaining-20261116/calf-presses/native/pause-calf-raise";
  const report = JSON.parse(readFileSync(`${dir}/kinematics.json`, "utf8"));
  expect(report.topPauseSeconds).toBe(2);
  const geometry = JSON.parse(readFileSync(`${dir}/geometry.json`, "utf8"));
  for (const sample of geometry) {
    expect(sample.crossbarClearance).toBeGreaterThan(.05);
    expect(sample.heelEdge).toBeLessThan(-1);
    expect(Math.abs(sample.contactT)).toBeLessThan(1);
  }
  expect(methodSteps("pause-calf-raise", "machine").join(" ")).toContain("상단에서 2초");
});
