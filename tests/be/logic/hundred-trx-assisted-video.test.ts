import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
describe("TRX assisted lower-body videos", () => {
  it.each(["trx-squat", "trx-lunge"])("connects %s with grounded support and fixed straps", async (id) => {
    expect(await getExerciseMedia(id, "trx")).toMatchObject({kind: "video", equipmentIds: ["trx"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
    expect(guideFor(id).setup).toContain("고정점");
    expect(methodSteps(id, "trx").join(" ")).toContain("바닥");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.strapLengthError).toBeLessThan(1e-5);
    expect(p.kinematics.gripError).toBeLessThan(1e-5);
    expect(p.kinematics.descent).toBeGreaterThan(3);
    expect(p.kinematics.loopError).toBe(0);
    if (id === "trx-lunge") expect(methodSteps(id, "trx").join(" ")).toContain("보조 런지");
  });
});
