import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["hanging-leg-raise", "hanging-leg-raise-2", "hanging-l-sit"]) {
  it(`connects ${id} to its hanging demonstration`, async () => {
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "machine")).toBeNull();
  });
  it(`${id} preserves straight knees and the intended hold or raise`, () => {
    const report = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/hanging-legs/native/${id}/kinematics.json`, "utf8"));
    const hold = id === "hanging-l-sit";
    expect(report.staticPose).toBe(hold);
    expect(report.gripError).toBeLessThan(1e-7);
    expect(report.kneeRange[0]).toBeGreaterThan(179.99);
    expect(report.elevationRange[0]).toBeCloseTo(hold ? 90 : 0);
    expect(report.elevationRange[1]).toBeCloseTo(90);
    const guide = JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8"));
    expect(guide.timing).toBe(hold ? "hold" : "continuous");
  });
}
