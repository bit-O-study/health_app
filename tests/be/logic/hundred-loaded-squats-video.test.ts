import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("loaded squat videos", () => {
  it.each(["band-squat", "overhead-squat", "thruster"])("connects %s with planted feet and correct load", async id => {
    const equipment = id === "band-squat" ? "band" : "barbell";
    expect(await getExerciseMedia(id, equipment)).toMatchObject({kind: "video", equipmentIds: [equipment], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(guideFor(id).setup).toContain(id === "band-squat" ? "밴드" : "바벨");
    expect(methodSteps(id, equipment).join(" ")).toContain(id === "band-squat" ? "손 높이" : id === "thruster" ? "일어나면서" : "팔을 편 상태");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.gripError).toBeLessThan(1e-5);
    expect(p.kinematics.loopError).toBe(0);
    if (id === "overhead-squat") expect(p.kinematics.elbowRange[0]).toBeGreaterThan(165);
    for (const g of p.geometry) {
      expect(g.floorClearance).toBeGreaterThanOrEqual(0);
      expect(g.shaftBody).toBeGreaterThan(0);
      if (id === "band-squat") expect(g.bandBody).toBeGreaterThan(0);
    }
  });
});
