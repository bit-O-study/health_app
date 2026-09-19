import { describe, expect, it } from "vitest";

import { motionDarkUrl, pickMotionSource } from "@/features/exercises/motion-variant";

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
