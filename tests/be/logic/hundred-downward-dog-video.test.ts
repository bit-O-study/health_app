import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Downward dog video", () => {
  it("connects a supported inverted V with stable hands and feet", async () => {
    const id = "downward-dog";
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({kind: "video", equipmentIds: ["bodyweight"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "ball")).toBeNull();
    expect(methodSteps(id, "bodyweight").join(" ")).toContain("거꾸로 된 V자");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.kneeRange[0]).toBeGreaterThan(155);
    expect(p.kinematics.elbowRange[0]).toBeGreaterThan(150);
    expect(p.kinematics.hipRange[1]).toBeLessThan(70);
    expect(p.kinematics.loopError).toBe(0);
  });
});
