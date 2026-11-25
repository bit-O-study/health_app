import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
for (const id of ["superman", "superman-pull"]) {
  it(`${id} connects bodyweight videos in both themes`, async () => {
    expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
    expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  });
  it(`${id} preserves mat clearance and its intended movement`, () => {
    const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/supermans/native/${id}/kinematics.json`, "utf8"));
    expect(r.minimumBodyGap).toBeGreaterThan(0.014);
    expect(r.minimumClothGap).toBeGreaterThan(0.014);
    expect(r.matContactGap).toBe(0.015);
    if (id === "superman") {
      expect(r.armRise).toBeGreaterThan(0.8);
      expect(r.legRise).toBeGreaterThan(1);
      expect(r.chestRise).toBeGreaterThan(0);
      expect(r.elbowRange[0]).toBeGreaterThan(179.999);
    } else {
      expect(r.rootRange).toBe(0);
      expect(r.elbowRetraction).toBeGreaterThan(4);
      expect(r.elbowRange[0]).toBeLessThan(65);
      expect(r.elbowRange[1]).toBeGreaterThan(179.99);
    }
  });
}
