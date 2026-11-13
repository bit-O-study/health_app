import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("TRX chest press video", () => {
  it("connects a straight-body press with fixed hands and feet", async () => {
    const id = "trx-chest-press";
    expect(await getExerciseMedia(id, "trx")).toMatchObject({kind: "video", equipmentIds: ["trx"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "bodyweight")).toBeNull();
    expect(methodSteps(id, "trx").join(" ")).toContain("손잡이를 밀며");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.supportDrift).toBeLessThan(1e-5);
    expect(p.kinematics.strapLengthError).toBeLessThan(1e-5);
    expect(p.kinematics.kneeRange[0]).toBeGreaterThan(170);
    expect(p.kinematics.elbowRange[1]).toBeGreaterThan(140);
    expect(p.kinematics.loopError).toBe(0);
  });
});
