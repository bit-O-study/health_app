import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

it("connects both reviewed tempo-push-up videos with matching bodyweight equipment", async () => {
  expect(await getExerciseMedia("tempo-push-up", "bodyweight")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/tempo-push-up.mp4"), darkUrl: expect.stringContaining("tempo-push-up-dark.mp4") });
  expect(await getExerciseMedia("tempo-push-up", "barbell")).toBeNull();
});

it("matches the displayed tempo to the rendered holds and movement", () => {
  expect(methodSteps("tempo-push-up", "bodyweight").join(" ")).toContain("3초 동안 내려가고 하단에서 1초");
  expect(guideFor("tempo-push-up").cues).toContain("상단에서 3초 멈춘 뒤 반복한다");
  const poses = JSON.parse(readFileSync("tools/media/imports/tempo-20261115/native/tempo-push-up/poses.json", "utf8"));
  expect(poses[180].joints).toEqual(poses[240].joints);
  expect(poses[300].joints).toEqual(poses[479].joints);
  expect(poses[0].joints).toEqual(poses[480].joints);
  expect(poses[0].joints.root).not.toEqual(poses[180].joints.root);
});
