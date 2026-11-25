import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects active hang to a bodyweight hold video", async () => {
  expect(await getExerciseMedia("active-hang", "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/active-hang.mp4"), darkUrl: expect.stringContaining("active-hang-dark.mp4") });
  expect(await getExerciseMedia("active-hang", "machine")).toBeNull();
});
it("shows a static extended-arm hang with feet clear of the floor", () => {
  const report = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/active-hang/native/active-hang/kinematics.json", "utf8"));
  expect(report.staticPose).toBe(true);
  expect(report.shoulderDrop).toBeGreaterThan(0.3);
  expect(report.bodyRise).toBeGreaterThan(0.3);
  expect(report.gripError).toBeLessThan(1e-7);
  expect(report.elbowRange[0]).toBeCloseTo(179);
  expect(report.elbowRange[1]).toBeCloseTo(179);
  expect(report.minimumFloorClearance).toBeGreaterThan(1);
  const guide = JSON.parse(readFileSync("tools/media/motion-guides/active-hang.json", "utf8"));
  expect(guide.timing).toBe("hold");
});
