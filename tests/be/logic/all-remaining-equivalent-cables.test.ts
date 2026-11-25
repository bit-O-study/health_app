import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: () => { throw new Error("Expected built-in video"); } }));
import { getExerciseMedia } from "@/features/exercises/exercise-media";
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";
import { REVIEWED_VIDEO_EQUIVALENTS } from "@/features/exercises/reviewed-video-equivalents";
it.each(Object.entries(REVIEWED_VIDEO_EQUIVALENTS))("connects equivalent entry %s to its reviewed equipment demonstration", async (id, original) => {
  const equipment = id === "assisted-pull-up-2" ? "machine" : "cable";
  expect(await getExerciseMedia(id, equipment)).toMatchObject({ kind: "video", url: expect.stringContaining(`/ai-v3/${id}.mp4`), darkUrl: expect.stringContaining(`${id}-dark.mp4`) });
  if (equipment === "machine") expect(await getExerciseMedia(id, "cable")).toBeNull();
  expect(await getExerciseMedia(id, "dumbbell")).toBeNull();
  expect(methodSteps(id, equipment)).toEqual(methodSteps(original, equipment));
  expect(guideFor(id)).toEqual(guideFor(original));
  const hash = (name: string) => createHash("sha256").update(readFileSync(`public/exercise-guides/ai-v3/${name}`)).digest("hex");
  if (equipment === "machine") {
    const candidate = JSON.parse(readFileSync(`tools/media/imports/all-remaining-20261116/assisted-pulls/native/${id}/candidate.json`, "utf8"));
    for (const output of candidate.outputs) expect(hash(output.file.split("/").at(-1))).toBe(output.sha256);
  } else {
    for (const suffix of [".mp4", "-dark.mp4", "-alpha.webm"]) expect(hash(id + suffix)).toBe(hash(original + suffix));
  }
});
