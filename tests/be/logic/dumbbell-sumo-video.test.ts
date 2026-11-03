import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("dumbbell sumo video", () => {
 it("describes two dumbbells in front with a wide stance", () => {
  const text=methodSteps("dumbbell-sumo-deadlift","dumbbell").join(" ");
  expect(text).toContain("양손");expect(text).toContain("몸 앞");expect(text).toContain("넓게");
  expect(guideFor("dumbbell-sumo-deadlift").cues.join(" ")).toContain("바닥에 닿기");
 });
 it("uses reviewed light and dark videos only for dumbbells", async () => {
  expect(await getExerciseMedia("dumbbell-sumo-deadlift","dumbbell")).toMatchObject({kind:"video",equipmentIds:["dumbbell"],darkUrl:expect.stringContaining("dumbbell-sumo-deadlift-dark.mp4")});
  expect(await getExerciseMedia("dumbbell-sumo-deadlift","barbell")).toBeNull();
 });
});
