import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const [id, span, tilt] of [["wide-grip-dip", 7, 15], ["close-grip-dip", 4.8, 0], ["forward-lean-dip", 5.6, 30]] as const) {
  it(`connects ${id} in both themes with bodyweight equipment`, async () => {
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  });
  it(`preserves ${id} grip, depth and body clearance`, () => {
    const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/dip-variants/native/${id}/kinematics.json`, "utf8"));
    expect(r.gripSpan).toBe(span);
    expect(r.torsoTilt).toBe(tilt);
    expect(r.minElbow).toBeCloseTo(95);
    expect(r.maxElbow).toBeCloseTo(175);
    expect(r.bottomUpperArmDrop).toBeLessThan(0.75);
    expect(r.maximumGripError).toBeLessThan(1e-10);
    expect(r.minimumBarBodyGap).toBeGreaterThan(0.4);
    expect(r.minimumFloorClearance).toBeGreaterThan(2);
    expect(r.maxStep).toBeLessThan(0.08);
  });
}
