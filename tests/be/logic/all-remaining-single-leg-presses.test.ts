import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["single-leg-leg-press", "single-leg-leg-press-2"]) {
  it(`connects ${id} to machine video in both themes`, async () => {
    expect(await getExerciseMedia(id, "machine")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
  });
  it(`${id} moves only the working leg through the reviewed range`, () => {
    const report = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/single-leg-presses/native/${id}/kinematics.json`, "utf8"));
    expect(report.idleFootMotion).toBe(0);
    expect(report.kneeRange[0]).toBeCloseTo(95);
    expect(report.kneeRange[1]).toBeCloseTo(165);
    expect(report.minimumIdlePlateGap).toBeGreaterThan(3.5);
  });
}
