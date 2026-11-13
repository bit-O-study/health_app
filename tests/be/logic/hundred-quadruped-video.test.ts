import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("quadruped exercise videos", () => {
  it.each(["donkey-kick", "fire-hydrant", "cat-cow"])("connects %s without sliding support", async id => {
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({kind: "video", equipmentIds: ["bodyweight"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "barbell")).toBeNull();
    expect(guideFor(id).setup).toContain("무릎");
    expect(methodSteps(id, "bodyweight").join(" ")).toContain(id === "cat-cow" ? "작은 범위" : "오른쪽 시범");
    const p=JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`,"utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.loopError).toBe(0);
    expect(p.kinematics.poseSamples).toBe(481);
    for(const g of p.geometry) {
      expect(g.floorClearance).toBeGreaterThanOrEqual(0);
      expect(Math.abs(g.palms-g.kneeL)).toBeLessThan(.1);
    }
  });
});
