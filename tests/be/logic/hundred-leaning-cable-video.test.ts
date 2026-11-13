import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Leaning cable lateral raise video", () => {
  it("connects a supported lean with cable and stack motion", async () => {
    const id = "leaning-cable-lateral-raise";
    expect(await getExerciseMedia(id, "cable")).toMatchObject({kind: "video", equipmentIds: ["cable"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(methodSteps(id, "cable").join(" ")).toContain("몸의 기울기를 유지");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.gripError).toBeLessThan(1e-5);
    expect(p.kinematics.cableTotalDrift).toBeLessThan(1e-5);
    expect(p.kinematics.leanRange[0]).toBeGreaterThan(10);
    expect(p.kinematics.stackTravel).toBeGreaterThan(1);
    expect(p.kinematics.loopError).toBe(0);
  });
});
