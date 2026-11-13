import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Cable woodchopper video", () => {
  it("connects cable media and the diagonal path and stack travel", async () => {
    const id = "cable-woodchopper";
    expect(await getExerciseMedia(id, "cable")).toMatchObject({kind: "video", equipmentIds: ["cable"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(methodSteps(id, "cable").join(" ")).toContain("대각선으로");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.gripError).toBeLessThan(1e-5);
    expect(p.kinematics.cableError).toBeLessThan(1e-5);
    expect(p.kinematics.drop).toBeGreaterThan(1);
    expect(p.kinematics.lateral).toBeGreaterThan(4.9);
    expect(p.kinematics.loopError).toBe(0);
  });
});
