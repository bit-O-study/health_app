import { describe, expect, it } from "vitest";

import { decideStepsState } from "@/features/health/steps-native";

describe("decideStepsState — 걸음수 진입 표시상태 판정", () => {
  it("웹/비네이티브면 숨김(unavailable)", () => {
    expect(decideStepsState("web", 0)).toEqual({ status: "unavailable" });
    // 웹이면 steps 값이 있어도 숨김
    expect(decideStepsState("web", 1234)).toEqual({ status: "unavailable" });
  });

  it("네이티브인데 권한/플러그인/HC 문제면 항상 버튼(denied) — 침묵실패 방지", () => {
    expect(decideStepsState("no-plugin", 0)).toEqual({ status: "denied" });
    expect(decideStepsState("hc-unavailable", 0)).toEqual({ status: "denied" });
    expect(decideStepsState("no-perm", 0)).toEqual({ status: "denied" });
  });

  it("권한 있으면 걸음수 표시(granted)", () => {
    expect(decideStepsState("ok", 8200)).toEqual({ status: "granted", steps: 8200 });
  });

  it("granted 인데 음수/0 은 0 으로 정규화", () => {
    expect(decideStepsState("ok", 0)).toEqual({ status: "granted", steps: 0 });
    expect(decideStepsState("ok", -5)).toEqual({ status: "granted", steps: 0 });
  });
});
