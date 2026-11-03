import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in media"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { guideFor } from "@/features/workout-timer/exercise-guides";
import specs from "@/features/workout-timer/motion-specs.json";

describe("popular exercise batch of three", () => {
 it.each(["bench-press", "deadlift", "plank"])("provides both reviewed themes for %s", async id => {
  const equipment = id === "plank" ? "bodyweight" : "barbell";
  expect(await getExerciseMedia(id, equipment)).toMatchObject({kind:"video",equipmentIds:[equipment],url:expect.stringContaining(`/ai-v3/${id}.mp4`),darkUrl:expect.stringContaining(`${id}-dark.mp4`)});
  expect(await getExerciseMedia(id, "cable")).toBeNull();
 });
 it("does not show a barbell video for dumbbell or machine bench press", async () => {
  expect(await getExerciseMedia("bench-press", "dumbbell")).toBeNull();
  expect(await getExerciseMedia("bench-press", "machine")).toBeNull();
 });
 it("uses hold timing for plank and explains the demonstration duration", () => {
  expect((specs as Record<string,{timing?:string}>).plank?.timing).toBe("hold");
  expect(guideFor("plank").beginnerTips.join(" ")).toContain("8초");
 });
});
