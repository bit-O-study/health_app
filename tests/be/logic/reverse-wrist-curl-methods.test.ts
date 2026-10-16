import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { methodSteps } from "@/features/routine/exercise-methods";
import { exerciseSummary, guideFor } from "@/features/workout-timer/exercise-guides";

it("matches the seated pronated wrist-extension video rather than an underhand wrist curl", () => {
  const steps = methodSteps("reverse-wrist-curl", "dumbbell").join(" ");
  expect(steps).toContain("손바닥이 아래");
  expect(steps).toContain("전완을 허벅지");
  const guide = guideFor("reverse-wrist-curl");
  expect(guide.setup).toContain("손바닥이 아래");
  expect(guide.cues.join(" ")).toContain("손등");
  expect(guide.cues.join(" ")).toContain("그립을 뒤집지");
  expect(exerciseSummary("reverse-wrist-curl").oneLiner).toContain("전완 신전근");
});
