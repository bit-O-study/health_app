import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "glute-bridge-march";
it("connects glute-bridge-march hold with bodyweight equipment in both themes", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  const guide = JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8"));
  expect(guide.timing).toBe("continuous");
});
it("maintains supported bridge alignment", () => {
 const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/bridge-march/native/${id}/kinematics.json`, "utf8"));
 expect(r.stationaryPelvis).toBe(true);
 expect(r.footLift).toBeGreaterThan(1.9);
 expect(r.maxStep).toBeLessThan(0.06);
 expect(r.minElbow).toBeCloseTo(175);
 expect(r.minKnee).toBeGreaterThan(80);
 expect(r.maxKnee).toBeLessThan(115);
 expect(r.hipAboveShoulder).toBeGreaterThan(2);
 for (const gap of Object.values(r.supportGaps)) { expect(gap).toBeGreaterThan(0.01); expect(gap).toBeLessThan(0.06); }
});
