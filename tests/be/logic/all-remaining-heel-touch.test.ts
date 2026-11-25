import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "heel-touch";
it("connects heel touch in both themes for bodyweight", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8")).timing).toBe("continuous");
});
it("alternates same-side heel reaches with fixed feet", () => {
  const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/heel-touch/native/${id}/kinematics.json`, "utf8"));
  expect(r.stationaryFeet).toBe(true);
  expect(r.alternatingHeelContact).toBe(true);
  expect(r.heelGaps.left).toBeLessThan(0.06);
  expect(r.heelGaps.right).toBeLessThan(0.06);
  expect(r.maxStep).toBeLessThan(0.04);
  expect(r.minElbow).toBeGreaterThan(179.99);
  expect(r.minKnee).toBeGreaterThan(35);
  expect(r.minKnee).toBeLessThan(70);
  for (const gap of Object.values(r.supportGaps)) { expect(gap).toBeGreaterThan(0.01); expect(gap).toBeLessThan(0.04); }
});
