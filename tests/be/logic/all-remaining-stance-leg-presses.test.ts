import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const [id, span] of [["wide-stance-leg-press", 4.8], ["close-stance-leg-press", 1.6], ["full-rom-leg-press", 3.2]] as const) {
  it(`connects ${id} to its distinct machine demonstration`, async () => {
    expect(await getExerciseMedia(id, "machine")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
  });
  it(`${id} preserves the reviewed width and knee range`, () => {
    const report = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/stance-leg-presses/native/${id}/kinematics.json`, "utf8"));
    expect(report.ankleSpan).toBe(span);
    expect(report.kneeRange[0]).toBeCloseTo(90);
    expect(report.kneeRange[1]).toBeCloseTo(165);
  });
}
