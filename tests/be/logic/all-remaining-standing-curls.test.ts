import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["standing-single-leg-curl", "standing-leg-curl-machine"]) {
  it(`connects ${id} to a standing machine video`, async () => {
    expect(await getExerciseMedia(id, "machine")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
  });
  it(`${id} keeps support while moving the loaded roller`, () => {
    const report = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/standing-curls/native/${id}/kinematics.json`, "utf8"));
    expect(report.gripError).toBeLessThan(1e-7);
    expect(report.rollerGapRange[0]).toBeGreaterThan(0);
    expect(report.rollerGapRange[1]).toBeLessThan(0.05);
    expect(report.loadRise).toBeGreaterThan(3);
    expect(report.kneeRange[0]).toBeCloseTo(80);
    expect(report.kneeRange[1]).toBeCloseTo(180);
  });
}
