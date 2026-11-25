import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
it("connects barbell calf raise to both video themes", async () => {
  expect(await getExerciseMedia("barbell-calf-raise", "barbell")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/barbell-calf-raise.mp4"), darkUrl: expect.stringContaining("barbell-calf-raise-dark.mp4") });
  expect(await getExerciseMedia("barbell-calf-raise", "machine")).toBeNull();
});
it("keeps forefeet supported as heels move below and above the step", () => {
  const report = JSON.parse(readFileSync("tools/media/imports/all-remaining-20261116/barbell-calf/native/barbell-calf-raise/kinematics.json", "utf8"));
  expect(report.gripError).toBeLessThan(1e-7);
  expect(report.toeHorizontalDrift).toBeLessThan(1e-7);
  expect(report.kneeRange[0]).toBeGreaterThan(170);
  expect(report.heelRange[0]).toBeLessThan(-8.175);
  expect(report.heelRange[1]).toBeGreaterThan(-8.175);
  expect(report.minimumBarGap).toBeGreaterThan(0);
  const guide = JSON.parse(readFileSync("tools/media/motion-guides/barbell-calf-raise.json", "utf8"));
  expect(guide.equipment).toBe("barbell");
});
