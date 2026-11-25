import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["wall-sit", "single-leg-wall-sit"]) {
  it(`connects ${id} to both video themes`, async () => {
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "machine")).toBeNull();
  });
  it(`${id} maintains the intended wall support and leg position`, () => {
    const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/wall-sits/native/${id}/kinematics.json`, "utf8"));
    const single = id === "single-leg-wall-sit";
    expect(r.staticPose).toBe(true);
    expect(r.leftKnee).toBeCloseTo(90);
    expect(r.rightKnee).toBeCloseTo(single ? 180 : 90);
    expect(r.leftSoleGap).toBeCloseTo(0.015);
    if (single) expect(r.rightSoleGap).toBeGreaterThan(4);
    else expect(r.rightSoleGap).toBeCloseTo(0.015);
    expect(r.backGap).toBeLessThan(0.04);
    expect(r.hipGap).toBeLessThan(0.02);
    expect(r.bodyWallClearance).toBeGreaterThan(0);
    const guide = JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8"));
    expect(guide.timing).toBe("hold");
  });
}
