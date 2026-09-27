import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => { throw new Error("Built-in media must not query the database"); }),
}));
vi.mock("../../../public/exercise-guides/ai-v2/manifest.json", () => ({ default: ["bench-press"] }));
vi.mock("../../../tools/media/ai-guides/reviews.json", () => ({
  default: [{ id: "bench-press", equipmentIds: ["barbell"] }],
}));

vi.mock("../../../public/exercise-guides/ai-v3/manifest.json", () => ({ default: ["dumbbell-shoulder-press", "rejected-guide", "meadows-row-2"] }));
vi.mock("../../../public/exercise-guides/ai-v3/manifest-dark.json", () => ({ default: ["meadows-row-2"] }));
vi.mock("../../../tools/media/motion-guides/reviews.json", () => ({
  default: [{ id: "dumbbell-shoulder-press", status: "passed", equipmentIds: ["dumbbell"] }, { id: "rejected-guide", status: "rejected", equipmentIds: ["barbell"] }, { id: "meadows-row-2", status: "passed", equipmentIds: ["landmine"] }],
}));

import { getExerciseMedia, selectExerciseMedia } from "@/features/exercises/exercise-media";

describe("selected equipment and built-in demonstration", () => {
  it("keeps the barbell guide for barbell bench press", async () => {
    expect(await getExerciseMedia("bench-press", "barbell")).toMatchObject({
      url: "/exercise-guides/ai-v2/bench-press.mp4",
    });
  });
  it("does not show barbell video for dumbbell or machine bench press", async () => {
    expect(await getExerciseMedia("bench-press", "dumbbell")).toBeNull();
    expect(await getExerciseMedia("bench-press", "machine")).toBeNull();
  });
});

it("filters queue media by the workout's selected equipment", () => {
  const media = { exerciseId: "bench-press", url: "/bench.mp4", kind: "video" as const, equipmentIds: ["barbell"] };
  expect(selectExerciseMedia(media, "dumbbell")).toBeNull();
  expect(selectExerciseMedia(media, "barbell")).toBe(media);
  expect(selectExerciseMedia(undefined, "barbell")).toBeNull();
});

it("uses reviewed motion media only for the matching equipment", async () => {
  expect(await getExerciseMedia("dumbbell-shoulder-press", "dumbbell")).toMatchObject({ url: "/exercise-guides/ai-v3/dumbbell-shoulder-press.mp4" });
  expect(await getExerciseMedia("dumbbell-shoulder-press", "machine")).toBeNull();
});

it("adds the dark-theme file only for cutout motion guides", async () => {
  expect(await getExerciseMedia("meadows-row-2", "landmine")).toMatchObject({
    url: "/exercise-guides/ai-v3/meadows-row-2.mp4",
    darkUrl: "/exercise-guides/ai-v3/meadows-row-2-dark.mp4",
  });
  expect(await getExerciseMedia("dumbbell-shoulder-press", "dumbbell")).not.toHaveProperty("darkUrl");
});

it("does not publish a rejected motion review even if its ID is in the manifest", async () => {
  await expect(getExerciseMedia("rejected-guide")).rejects.toThrow("Built-in media must not query the database");
});
