import type { ExerciseMedia } from "./exercise-media";

// Source and encoded-file hashes: tools/media/motion-refresh/skinned-3d/batch-7-reviews.json.
// Keep the existing native guides for overlapping IDs. Upright row is dumbbell only.
export const SKINNED_MEDIA: Record<string, ExerciseMedia> = Object.fromEntries(
  [
    ["arnold-press", "dumbbell"],
    ["upright-row", "dumbbell"],
    ["close-grip-upright-row", "barbell"],
  ].map(([exerciseId, equipment]) => [exerciseId, {
    exerciseId,
    kind: "video" as const,
    equipmentIds: [equipment],
    url: `/exercise-guides/skinned-pilot/${exerciseId}.mp4?v=20261101`,
    darkUrl: `/exercise-guides/skinned-pilot/${exerciseId}-dark.mp4?v=20261101`,
  }]),
);
