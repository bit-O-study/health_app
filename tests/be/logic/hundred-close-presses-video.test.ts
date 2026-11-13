import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("close dumbbell press videos", () => {
  it.each(["squeeze-press", "tate-press"])("connects %s with clear weights and supported head", async id => {
    expect(await getExerciseMedia(id, "dumbbell")).toMatchObject({kind: "video", equipmentIds: ["dumbbell"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "barbell")).toBeNull();
    expect(guideFor(id).setup).toContain("벤치");
    expect(methodSteps(id, "dumbbell").join(" ")).toContain(id === "tate-press" ? "팔꿈치를 옆으로" : "덤벨을 모은 채");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.topElbowDegrees).toBeGreaterThan(165);
    expect(p.kinematics.loopError).toBe(0);
    for (const g of p.geometry) {
      expect(g.headSupportError).toBeLessThan(1e-5);
      expect(g.equipmentPairClearance).toBeGreaterThanOrEqual(0);
      expect(g.equipmentBodyClearance).toBeGreaterThan(0);
      expect(g.equipmentPadClearance).toBeGreaterThan(0);
    }
  });
});
