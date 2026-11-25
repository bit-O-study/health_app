import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["hanging-oblique-raise", "hanging-knee-raise-twist"]) {
  it(`connects ${id} to both video themes`, async () => {
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "machine")).toBeNull();
  });
  it(`${id} alternates pelvic rotation with bent knees and stable grip`, () => {
    const report = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/hanging-twists/native/${id}/kinematics.json`, "utf8"));
    expect(report.gripError).toBeLessThan(1e-7);
    expect(report.upperDrift).toBeLessThan(1e-7);
    expect(report.kneeRange[0]).toBeGreaterThan(89);
    expect(report.kneeRange[0]).toBeLessThan(91);
    expect(report.pelvicTwistRange).toEqual([-25, 25]);
    const guide = JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8"));
    expect(guide.timing).toBe("continuous");
  });
}
