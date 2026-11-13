import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("reviewed push-up variants", () => {
  it.each([
    ["decline-push-up", "발판"],
    ["close-grip-push-up", "어깨너비보다 좁게"],
    ["wide-push-up", "어깨너비보다 넓게"],
  ])("matches the setup and video for %s", async (id, setup) => {
    expect(methodSteps(id, "bodyweight").join(" ")).toContain(setup);
    expect(guideFor(id).setup).toContain(setup);
    expect(methodSteps(id, "bodyweight").join(" ")).not.toContain("정점에서 1초");
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", equipmentIds: ["bodyweight"], url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "barbell")).toBeNull();
    const provenance = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(provenance.kinematics.poseSamples).toBe(481);
    expect(provenance.kinematics.elbowDegrees[1]).toBeGreaterThan(170);
    expect(provenance.kinematics.footDrift).toBeLessThan(.01);
  });
});
