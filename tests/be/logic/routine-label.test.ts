import { describe, expect, it } from "vitest";

import { routineDisplayLabel } from "@/features/routine/routine-label";

describe("routineDisplayLabel — 분할·변형 라벨 중복 제거", () => {
  it("커스텀 중복은 변형명만('커스텀 루틴')", () => {
    expect(routineDisplayLabel("커스텀", "커스텀 루틴")).toBe("커스텀 루틴");
  });

  it("중복 아니면 ' · ' 로 결합", () => {
    expect(routineDisplayLabel("3분할", "PPL")).toBe("3분할 · PPL");
  });

  it("동일하면 하나만", () => {
    expect(routineDisplayLabel("커스텀", "커스텀")).toBe("커스텀");
  });

  it("한쪽이 비면 다른 쪽만", () => {
    expect(routineDisplayLabel("", "PPL")).toBe("PPL");
    expect(routineDisplayLabel("5분할", "")).toBe("5분할");
  });
});
