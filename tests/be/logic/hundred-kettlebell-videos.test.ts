import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("reviewed two-handed kettlebell videos", () => {
  it.each(["kettlebell-swing", "kettlebell-sumo-squat"])("serves verified themes only for kettlebells: %s", async id => {
    expect(await getExerciseMedia(id, "kettlebell")).toMatchObject({ kind: "video", equipmentIds: ["kettlebell"], url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "barbell")).toBeNull();
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.poseSamples).toBe(481);
    expect(p.kinematics.gripError).toBeLessThan(.001);
    expect(p.kinematics.footDrift).toBeLessThan(.001);
    expect(p.kinematics.minimumBellClothGap).toBeGreaterThan(0);
  });
  it("distinguishes swing hip drive from a controlled squat", () => {
    const swing = methodSteps("kettlebell-swing", "kettlebell").join(" ");
    const squat = methodSteps("kettlebell-sumo-squat", "kettlebell").join(" ");
    expect(swing).toContain("엉덩이를 펴는 힘");
    expect(swing).toContain("어깨 높이");
    expect(squat).toContain("무릎을 발끝 방향");
    expect(squat).toContain("휘두르지 않는다");
    expect(guideFor("kettlebell-swing").beginnerTips.join(" ")).toContain("실제 스윙 속도");
    expect(guideFor("kettlebell-sumo-squat").beginnerTips.join(" ")).toContain("바닥에 닿기 전에");
  });
});
