import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
const id = "legs-up-the-wall-pose";
it("connects legs-up-wall hold with bodyweight equipment in both themes", async () => {
  expect(await getExerciseMedia(id, "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  const guide = JSON.parse(readFileSync(`tools/media/motion-guides/${id}.json`, "utf8"));
  expect(guide.timing).toBe("hold");
});
it("keeps the legs straight with wall and floor support", () => {
 const r = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/legs-wall/native/${id}/kinematics.json`, "utf8"));
 expect(r.staticHold).toBe(true);
 expect(r.minElbow).toBeGreaterThan(179.999);
 expect(r.minKnee).toBeGreaterThan(179.999);
 for (const gap of Object.values(r.supportGaps)) { expect(gap).toBeGreaterThan(0.01); expect(gap).toBeLessThan(0.03); }
 expect(r.minimumWallGap).toBeGreaterThan(0.01);
});
