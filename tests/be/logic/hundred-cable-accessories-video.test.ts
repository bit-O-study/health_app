import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
const ids = ["cable-external-rotation", "band-external-rotation", "high-cable-fly", "standing-cable-reverse-fly", "cable-y-raise", "cable-shrug"];
describe("cable accessories", () => {
  it.each(ids)("connects %s to reviewed motion and matching guidance", async id => {
    const equipment = id.startsWith("band") ? "band" : "cable";
    expect(await getExerciseMedia(id, equipment)).toMatchObject({kind: "video", equipmentIds: [equipment], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "barbell")).toBeNull();
    expect(guideFor(id).setup).toContain("손잡이");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(.001);
    expect(p.kinematics.gripError).toBeLessThan(.001);
    expect(p.kinematics.cableLengthError).toBeLessThan(.001);
    expect(p.kinematics.lengthChange).toBeGreaterThan(.3);
    if (id.endsWith("external-rotation")) {
      expect(p.kinematics.inactiveDrift).toBeLessThan(.001);
      expect(methodSteps(id, equipment).join(" ")).toContain("90도");
    }
    if (id === "cable-shrug") expect(methodSteps(id, equipment).join(" ")).toContain("팔꿈치를 굽히지 않고");
  });
});
