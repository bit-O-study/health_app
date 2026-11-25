import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["reverse-snow-angel"]) {
  it(`${id} connects both video themes to bodyweight equipment`, async () => {
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "cable")).toBeNull();
  });
  it(`${id} preserves its arm shape with a stationary trunk and legs`, () => {
    const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/snow-angel/native/${id}/kinematics.json`, "utf8"));
    expect(r.stationaryTrunk).toBe(true);
    expect(r.stationaryLegs).toBe(true);
    expect(r.elbowRange[0]).toBeCloseTo(180);
    expect(r.elbowRange[1]).toBeCloseTo(180);
    expect(r.sweepDegrees).toBeCloseTo(150);
    expect(r.heightDrift).toBeLessThan(1e-7);
    expect(r.maxStep).toBeLessThan(0.13);
    expect(r.minimumPalmGap).toBeGreaterThan(1);
    expect(r.minimumBodyGap).toBeGreaterThan(0);
    expect(r.minimumClothGap).toBeGreaterThan(0);
  });
}
