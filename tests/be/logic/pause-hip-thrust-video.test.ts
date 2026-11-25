import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

it("connects reviewed pause hip thrust videos only for barbell equipment", async () => {
  expect(await getExerciseMedia("pause-hip-thrust", "barbell")).toMatchObject({ kind: "video", url: expect.stringContaining("/ai-v3/pause-hip-thrust.mp4"), darkUrl: expect.stringContaining("pause-hip-thrust-dark.mp4") });
  expect(await getExerciseMedia("pause-hip-thrust", "bodyweight")).toBeNull();
});

it("matches displayed pause timing to all 121 held poses and the moving cycle", () => {
  expect(methodSteps("pause-hip-thrust", "barbell").join(" ")).toContain("상단에서 2초 멈춘 뒤 3초");
  expect(guideFor("pause-hip-thrust").cues).toContain("상단에서 2초 멈춘 뒤 3초 동안 내려온다");
  const poses = JSON.parse(readFileSync("tools/media/imports/pause-hip-thrust-20261115/native/pause-hip-thrust/poses.json", "utf8"));
  for (let frame = 180; frame <= 300; frame++) expect(poses[frame].joints).toEqual(poses[180].joints);
  expect(poses[0].joints).toEqual(poses[480].joints);
  expect(poses[0].joints.bar).not.toEqual(poses[180].joints.bar);
  expect(poses[360].joints.bar).not.toEqual(poses[300].joints.bar);
});
