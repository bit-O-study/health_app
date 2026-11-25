import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["medium-grip-pull-up", "close-grip-chin-up"]) {
  it(`connects ${id} to both video themes`, async () => {
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "machine")).toBeNull();
  });
  it(`${id} preserves the specified grip width and full controlled pull`, () => {
    const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/grip-pulls/native/${id}/kinematics.json`, "utf8"));
    expect(r.gripSpan).toBeCloseTo(id === "close-grip-chin-up" ? 2.2 : 4.8);
    expect(r.gripError).toBeLessThan(1e-7);
    expect(r.relativeLegDrift).toBeLessThan(1e-7);
    expect(r.kneeRange[0]).toBeGreaterThan(179.99);
    expect(r.elevationRange[1]).toBeCloseTo(0);
    expect(r.bodyRise).toBeGreaterThan(5);
    expect(r.elbowRange[0]).toBeLessThan(60);
    expect(r.elbowRange[1]).toBeGreaterThan(178);
    expect(r.minimumBarClearance).toBeGreaterThan(0.1);
  });
}
