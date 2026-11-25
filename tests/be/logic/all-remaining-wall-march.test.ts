import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects wall-sit march to both video themes", async () => {
  expect(await getExerciseMedia("wall-sit-march", "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/wall-sit-march.mp4"), darkUrl: expect.stringContaining("wall-sit-march-dark.mp4") });
  expect(await getExerciseMedia("wall-sit-march", "machine")).toBeNull();
});
it("alternates foot lifts while keeping trunk and opposite foot stable", () => {
  const r = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/wall-march/native/wall-sit-march/kinematics.json", "utf8"));
  expect(r.stationaryTrunk).toBe(true);
  expect(r.alternateSupport).toBe(true);
  expect(r.leftFootRise).toBeGreaterThan(1);
  expect(r.rightFootRise).toBeCloseTo(r.leftFootRise);
  expect(r.maxStep).toBeLessThan(0.03);
  expect(r.backGap).toBeLessThan(0.04);
  const guide = JSON.parse(readFileSync("tools/media/motion-guides/wall-sit-march.json", "utf8"));
  expect(guide.timing).toBe("continuous");
});
