import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["prone-t-raise", "prone-w-raise"]) {
  it(`${id} connects both video themes to dumbbell equipment`, async () => {
    expect(await getExerciseMedia(id, "dumbbell")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
  });
  it(`${id} preserves its arm shape with a stationary trunk and legs`, () => {
    const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/prone-tw/native/${id}/kinematics.json`, "utf8"));
    expect(r.stationaryTrunk).toBe(true);
    expect(r.stationaryLegs).toBe(true);
    expect(r.elbowRange[0]).toBeCloseTo(id === "prone-t-raise" ? 180 : 90);
    expect(r.elbowRange[1]).toBeCloseTo(id === "prone-t-raise" ? 180 : 90);
    expect(r.handRise).toBeGreaterThan(0.7);
    expect(r.maxStep).toBeLessThan(0.02);
    expect(r.weightFloorGap).toBeGreaterThan(0.3);
    expect(r.minimumBodyGap).toBeGreaterThan(0);
    expect(r.minimumClothGap).toBeGreaterThan(0);
  });
}
