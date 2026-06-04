import { describe, expect, it } from "vitest";

import { balanceColorsByMuscle } from "@/features/routine/muscle-balance";

describe("muscle-balance (점수 부위색 → 3D 마네킹 부위색 매핑)", () => {
  it("leg → lower 로 매핑하고 나머지는 동일 키로 옮긴다", () => {
    const out = balanceColorsByMuscle({
      chest: "#a",
      back: "#b",
      shoulder: "#c",
      arm: "#d",
      leg: "#e",
      core: "#f",
    });
    expect(out).toEqual({
      chest: "#a",
      back: "#b",
      shoulder: "#c",
      arm: "#d",
      lower: "#e", // leg → lower
      core: "#f",
    });
  });

  it("마네킹은 lower 키를 쓰고 leg 키는 없다 (3D 매핑 일관성)", () => {
    const out = balanceColorsByMuscle({ leg: "#0f0" });
    expect(out.lower).toBe("#0f0");
    expect("leg" in out).toBe(false);
  });

  it("일부 부위만 있어도 그대로 옮긴다", () => {
    const out = balanceColorsByMuscle({ chest: "#111", core: "#222" });
    expect(out.chest).toBe("#111");
    expect(out.core).toBe("#222");
    expect(out.lower).toBeUndefined();
  });
});