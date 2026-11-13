import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("nordic video", () => {
  it("describes supported ankles and the demonstrated partial range", () => {
    expect(methodSteps("nordic-hamstring-curl", "bodyweight").join(" ")).toContain("발목을");
    expect(guideFor("nordic-hamstring-curl").beginnerTips.join(" ")).toContain("45도");
  });
  it("serves both themes with stable knee and ankle support", async () => {
    expect(await getExerciseMedia("nordic-hamstring-curl", "bodyweight")).toMatchObject({ kind: "video", equipmentIds: ["bodyweight"], url: expect.stringContaining("nordic-hamstring-curl.mp4"), darkUrl: expect.stringContaining("nordic-hamstring-curl-dark.mp4") });
    const p = JSON.parse(readFileSync("tools/media/motion-guides/nordic-hamstring-curl-provenance.json", "utf8"));
    expect(p.kinematics.poseSamples).toBe(481);
    expect(p.kinematics.supportDrift).toBeLessThan(.001);
    expect(p.kinematics.kneeGap).toBeLessThan(.08);
    expect(p.kinematics.ankleGap).toBeLessThan(.05);
  });
});
