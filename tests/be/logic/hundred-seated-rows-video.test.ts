import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("seated row videos", () => {
  it.each(["wide-grip-cable-row", "single-arm-cable-row", "band-row"])("connects %s with supported seated motion", async id => {
    const equipment = id === "band-row" ? "band" : "cable";
    expect(await getExerciseMedia(id, equipment)).toMatchObject({ kind: "video", equipmentIds: [equipment], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4") });
    expect(await getExerciseMedia(id, "barbell")).toBeNull();
    expect(guideFor(id).setup).toContain("벤치");
    const steps = methodSteps(id, equipment).join(" ");
    expect(steps).toContain(id === "single-arm-cable-row" ? "왼팔" : id === "band-row" ? "고정점" : "독립된 두");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(.001);
    expect(p.kinematics.gripError).toBeLessThan(.001);
    expect(p.kinematics.seatGap).toBeGreaterThanOrEqual(0);
    expect(p.kinematics.seatGap).toBeLessThan(.1);
    for (const gap of p.kinematics.footGaps) expect(Math.abs(gap)).toBeLessThan(.15);
    if (id === "single-arm-cable-row") expect(p.kinematics.inactiveDrift).toBeLessThan(.001);
  });
});
