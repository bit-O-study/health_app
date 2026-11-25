import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["chest-supported-rear-delt-raise"]) {
  it(`${id} connects both themes to dumbbell equipment`, async () => {
    expect(await getExerciseMedia(id, "dumbbell")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
  });
  it(`${id} preserves support and its distinct arm direction`, () => {
    const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/supported-rear/native/${id}/kinematics.json`, "utf8"));
    expect(r.stationarySupport).toBe(true);
    expect(r.chestGap).toBeCloseTo(0);
    expect(r.floorGap).toBeGreaterThan(0);
    expect(r.floorGap).toBeLessThan(0.02);
    expect(r.minimumWeightBodyGap).toBeGreaterThan(2);
    expect(r.minimumWeightPadGap).toBeGreaterThan(2);
    expect(r.elbowRange[0]).toBeGreaterThan(165);
    if (id === "incline-dumbbell-y-raise") expect(r.finalUpperArmDirection[1]).toBeGreaterThan(0.55);
    else expect(r.finalUpperArmDirection[1]).toBeCloseTo(0);
  });
}
