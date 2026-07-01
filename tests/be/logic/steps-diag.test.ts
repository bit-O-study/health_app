import { describe, expect, it } from "vitest";

import { formatStepsDiag, type StepsDiag } from "@/features/health/steps-native";

const base: StepsDiag = {
  ua: true,
  bridge: true,
  native: true,
  plugin: true,
  availability: "Available",
  granted: ["Steps"],
  recordCount: 12,
  steps: 8200,
  error: null,
};

describe("formatStepsDiag — 화면 디버그 한 줄", () => {
  it("앱UA/브릿지/네이티브 플래그를 항상 포함(앱 안 네이티브 감지 확인용)", () => {
    expect(formatStepsDiag(base)).toContain("앱UAO");
    expect(formatStepsDiag(base)).toContain("브릿지O");
    expect(formatStepsDiag(base)).toContain("네이티브O");
    // UA 표식은 있는데(새 APK) window.Capacitor 는 없는 경우(#7269)를 구분해 보여준다.
    const s = formatStepsDiag({ ...base, ua: true, bridge: false });
    expect(s).toContain("앱UAO");
    expect(s).toContain("브릿지X");
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
