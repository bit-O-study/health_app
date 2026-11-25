import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["piriformis-stretch", "lying-glute-stretch"]) {
  it(`${id} connects a hold for bodyweight in both themes`, async () => {
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("hold");
  });
  it(`${id} supports ankle and knee while opposite leg stays straight`, () => {
    const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/cross-glute/native/${id}/kinematics.json`, "utf8"));
    expect(r.staticHold).toBe(true);
    expect(r.kneeCrossesMidline).toBe(true);
    expect(r.kneeDegrees.R).toBeGreaterThan(179.99);
    expect(r.kneeDegrees.L).toBeGreaterThan(80);
    expect(r.kneeDegrees.L).toBeLessThan(100);
    expect(r.handKneeGap).toBeLessThan(0.04);
    expect(r.handAnkleGap).toBeLessThan(0.03);
    for (const gap of Object.values(r.supportGaps)) {
      expect(gap).toBeGreaterThan(0.01);
      expect(gap).toBeLessThan(0.04);
    }
  });
}
