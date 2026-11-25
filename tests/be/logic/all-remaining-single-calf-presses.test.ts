import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["single-leg-calf-press", "single-leg-leg-press-calf-raise"]) {
  it(`connects ${id} only to its machine video`, async () => {
    expect(await getExerciseMedia(id, "machine")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
  });
  it(`${id} keeps the other foot supported and away from the sled`, () => {
    const report = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/single-calf-presses/native/${id}/kinematics.json`, "utf8"));
    expect(report.idleFootMotion).toBe(0);
    expect(report.minimumIdlePlateGap).toBeGreaterThan(5);
    expect(report.gripError).toBeLessThan(1e-7);
  });
}
