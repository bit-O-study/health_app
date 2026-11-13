import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("supported pull videos", () => {
  it.each(["incline-rear-delt-raise", "incline-bench-dumbbell-row", "prone-y-raise"])("connects %s with stable chest support", async id => {
    expect(await getExerciseMedia(id, "dumbbell")).toMatchObject({kind: "video", equipmentIds: ["dumbbell"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "barbell")).toBeNull();
    expect(guideFor(id).setup).toContain("벤치");
    expect(methodSteps(id, "dumbbell").join(" ")).toContain(id === "prone-y-raise" ? "Y자" : id === "incline-bench-dumbbell-row" ? "팔꿈치를 뒤로" : "양팔을 옆으로");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.loopError).toBe(0);
    expect(p.kinematics.poseSamples).toBe(481);
    for (const g of p.geometry) {
      expect(Math.abs(g.chestGap)).toBeLessThan(.01);
      expect(g.floorClearance).toBeGreaterThanOrEqual(0);
      expect(g.equipmentBodyClearance).toBeGreaterThan(0);
      expect(g.equipmentPadClearance).toBeGreaterThan(0);
    }
  });
});
