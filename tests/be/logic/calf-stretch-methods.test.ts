import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { methodSteps } from "@/features/routine/exercise-methods";

describe("calf stretch instructions supplied to workout mode", () => {
  it.each(["calf-stretch", "wall-calf-stretch"])("%s describes a supported hold instead of squats", (id) => {
    const instructions = methodSteps(id, "bodyweight").join(" ");
    expect(instructions).toContain("벽");
    expect(instructions).toContain("뒤꿈치를 바닥에");
    expect(instructions).toContain("뒤쪽 무릎을 편");
    expect(instructions).toContain("유지");
    expect(instructions).toContain("반대쪽");
    expect(instructions).not.toMatch(/고관절과 무릎을 동시에|힘으로 일어선다/);
  });
});
