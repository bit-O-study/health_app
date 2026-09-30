import { describe, expect, it } from "vitest";

import { motionDarkUrl, motionMediaVersion, pickMotionSource } from "@/features/exercises/motion-variant";

describe("pickMotionSource", () => {
  const light = "/exercise-guides/ai-v3/meadows-row-2.mp4";
  const dark = motionDarkUrl("meadows-row-2");

  it("builds the dark file next to the light file", () => {
    expect(dark).toBe("/exercise-guides/ai-v3/meadows-row-2-dark.mp4");
  });

  it("picks the video that matches the workout screen theme", () => {
    expect(pickMotionSource(light, dark, false)).toBe(light);
    expect(pickMotionSource(light, dark, true)).toBe(dark);
  });

  it("waits for the theme instead of loading the wrong variant", () => {
    expect(pickMotionSource(light, dark, null)).toBeUndefined();
  });

  it("keeps single-file media unchanged in every theme", () => {
    for (const isDark of [null, false, true]) {
      expect(pickMotionSource("/bench.mp4", undefined, isDark)).toBe("/bench.mp4");
    }
  });
});

it("uses the same refreshed revision for both theme cache keys", () => {
  for (const id of ["hollow-body-hold", "plate-pinch", "stability-ball-plank", "dumbbell-shrug", "dumbbell-biceps-curl", "hammer-curl-2", "dumbbell-front-raise", "triceps-kickback"]) {
    const version = motionMediaVersion(id);
    expect(version).not.toBe("");
    expect(motionDarkUrl(id)).toBe(`/exercise-guides/ai-v3/${id}-dark.mp4${version}`);
  }
  expect(motionMediaVersion("unreviewed-guide")).toBe("");
});
