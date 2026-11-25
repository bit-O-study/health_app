import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["seated-leg-press-machine", "horizontal-calf-raise-machine"]) {
  it(`connects ${id} to the horizontal machine`, async () => {
    expect(await getExerciseMedia(id, "machine")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
  });
  it(`${id} preserves support and cable travel`, () => {
    const report = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/horizontal-presses/native/${id}/kinematics.json`, "utf8"));
    expect(report.cableLengthError).toBeLessThan(1e-10);
    expect(report.minSeatGap).toBeGreaterThan(0);
    expect(report.stackTravel).toBeGreaterThan(0.8);
    expect(report.kneeRange[0]).toBeCloseTo(id.startsWith("horizontal") ? 165 : 90);
  });
}
