import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Push jerk video", () => {
  it("connects barbell media and the second knee bend", async () => {
    const id = "push-jerk";
    expect(await getExerciseMedia(id, "barbell")).toMatchObject({kind: "video", equipmentIds: ["barbell"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(methodSteps(id, "barbell").join(" ")).toContain("바 아래로 몸을 낮추며");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.gripError).toBeLessThan(1e-5);
    expect(p.kinematics.catchDip).toBeGreaterThan(1.8);
    expect(p.kinematics.overhead).toBeGreaterThan(1);
    expect(p.kinematics.recovery).toBeGreaterThan(1.8);
    expect(p.kinematics.loopError).toBe(0);
  });
});
