import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
import type { EquipmentId } from "@/features/routine/exercise-catalog";
const ids = ["standing-band-row", "band-chest-press", "band-shoulder-press", "band-pulldown", "band-face-pull", "standing-cable-chest-press", "single-arm-lat-pulldown", "single-arm-straight-arm-pulldown", "single-arm-cable-front-raise", "single-arm-cable-lateral-raise"];
describe("resistance video set", () => {
  it.each(ids)("connects %s with fixed support and continuous resistance", async id => {
    const equipment: EquipmentId = id.includes("band") ? "band" : "cable";
    expect(await getExerciseMedia(id, equipment)).toMatchObject({kind: "video", equipmentIds: [equipment], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "barbell")).toBeNull();
    expect(methodSteps(id, equipment).join(" ")).toContain("손잡이");
    expect(guideFor(id).setup).toContain("손잡이");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(.001);
    expect(p.kinematics.gripError).toBeLessThan(.001);
    expect(p.kinematics.lengthChange).toBeGreaterThan(.3);
    if (equipment === "cable") expect(p.kinematics.cableLengthError).toBeLessThan(.001);
    if (id.startsWith("single-arm")) expect(p.kinematics.inactiveDrift).toBeLessThan(.001);
  });
  it("distinguishes straight-arm pulling from elbow bending", () => {
    expect(methodSteps("single-arm-straight-arm-pulldown", "cable").join(" ")).toContain("작은 굽힘을 유지");
    expect(methodSteps("single-arm-lat-pulldown", "cable").join(" ")).toContain("팔꿈치를 아래로 굽혀");
  });
});
