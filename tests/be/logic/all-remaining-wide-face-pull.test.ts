import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["wide-cable-face-pull"]) {
  it(`${id} connects both video themes only to cable equipment`, async () => {
    expect(await getExerciseMedia(id, "cable")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
  });
  it(`${id} keeps support and rope length stable through the pull`, () => {
    const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/wide-face-pull/native/${id}/kinematics.json`, "utf8"));
    expect(r.stationarySupport).toBe(true);
    expect(r.supportGap).toBeCloseTo(0.015);
    expect(r.ropeError).toBeLessThan(1e-7);
    expect(r.cableError).toBeLessThan(1e-7);
    expect(r.stackTravel).toBeGreaterThan(4);
    expect(r.finalSpan).toBeCloseTo(7.6);
    expect(r.elbowRange[1]).toBeGreaterThan(145);
    expect(r.elbowRange[0]).toBeLessThan(100);
    expect(r.maxStep).toBeLessThan(0.05);
  });
}
