import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Side lying lateral raise video", () => {
  it("connects a supported side lying raise with a single dumbbell", async () => {
    const id = "lying-side-lateral-raise";
    expect(await getExerciseMedia(id, "dumbbell")).toMatchObject({kind: "video", equipmentIds: ["dumbbell"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "cable")).toBeNull();
    expect(methodSteps(id, "dumbbell").join(" ")).toContain("위쪽 팔을 천장");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.gripError).toBeLessThan(1e-5);
    expect(p.kinematics.rise).toBeGreaterThan(4);
    expect(p.kinematics.topArmHorizontal).toBeLessThan(.2);
    expect(p.kinematics.plateBody).toBeGreaterThan(0);
    expect(p.kinematics.loopError).toBe(0);
  });
});
