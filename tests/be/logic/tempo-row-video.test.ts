import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

it("connects reviewed tempo row videos only for barbell equipment", async () => {
  expect(await getExerciseMedia("tempo-row", "barbell")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/tempo-row.mp4"), darkUrl: expect.stringContaining("tempo-row-dark.mp4") });
  expect(await getExerciseMedia("tempo-row", "bodyweight")).toBeNull();
});

it("matches displayed tempo to the held poses and controlled lowering", () => {
  expect(methodSteps("tempo-row", "barbell").join(" ")).toContain("1초 멈춘 뒤 3초 동안 내린다");
  expect(guideFor("tempo-row").cues).toContain("3초 동안 내리고 하단에서 3초 멈춘다");
  const poses = JSON.parse(readFileSync("tools/media/imports/tempo-row-20261115/native/tempo-row/poses.json", "utf8"));
  for (let frame = 60; frame <= 120; frame++) expect(poses[frame].joints).toEqual(poses[60].joints);
  for (let frame = 300; frame <= 480; frame++) expect(poses[frame].joints).toEqual(poses[0].joints);
  expect(poses[60].joints.bar[1]).toBeGreaterThan(poses[0].joints.bar[1]);
  expect(poses[210].joints.bar[1]).toBeLessThan(poses[120].joints.bar[1]);
  expect(poses[210].joints.bar[1]).toBeGreaterThan(poses[300].joints.bar[1]);
});
