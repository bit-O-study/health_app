import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
describe("Sled walking videos", () => {
  for (const id of ["sled-push", "sled-pull"]) it(id + " connects sled media and supported walking", async () => {
    expect(await getExerciseMedia(id, "sled")).toMatchObject({kind: "video", equipmentIds: ["sled"], url: expect.stringContaining(id + ".mp4"), darkUrl: expect.stringContaining(id + "-dark.mp4")});
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
    expect(methodSteps(id, "sled").join(" ")).toContain(id === "sled-pull" ? "뒤로" : "앞으로");
    const p = JSON.parse(readFileSync(`tools/media/motion-guides/${id}-provenance.json`, "utf8"));
    expect(p.kinematics.stanceDrift).toBeLessThan(1e-5);
    expect(p.kinematics.gripError).toBeLessThan(1e-5);
    expect(p.kinematics.footLift).toBeGreaterThan(.79);
    expect(p.kinematics.supportFrames).toBe(481);
    expect(p.kinematics.loopError).toBe(0);
  });
});
