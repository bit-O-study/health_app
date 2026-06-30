import { describe, expect, it } from "vitest";

import { formatStepsDiag, type StepsDiag } from "@/features/health/steps-native";

const base: StepsDiag = {
  native: true,
  plugin: true,
  availability: "Available",
  granted: ["Steps"],
  recordCount: 12,
  steps: 8200,
  error: null,
};

describe("formatStepsDiag — 화면 디버그 한 줄", () => {
  it("웹이면 명확히 표기", () => {
    expect(formatStepsDiag({ ...base, native: false })).toBe("웹(네이티브 아님)");
  });

  it("정상 케이스: 권한 개수·레코드·합계 포함", () => {
    const s = formatStepsDiag(base);
    expect(s).toContain("플러그인O");
    expect(s).toContain("HC=Available");
    expect(s).toContain("권한=1");
    expect(s).toContain("레코드=12");
    expect(s).toContain("합계=8200");
  });

  it("권한 0개 / 미수집이면 - 로 표시", () => {
    const s = formatStepsDiag({
      ...base,
      granted: [],
      recordCount: null,
      steps: null,
    });
    expect(s).toContain("권한=0");
    expect(s).toContain("레코드=-");
    expect(s).toContain("합계=-");
  });

  it("플러그인 미로드는 X", () => {
    expect(formatStepsDiag({ ...base, plugin: false })).toContain("플러그인X");
  });

  it("오류가 있으면 끝에 사유 포함", () => {
    expect(formatStepsDiag({ ...base, error: "boom" })).toContain("오류:boom");
  });
});
