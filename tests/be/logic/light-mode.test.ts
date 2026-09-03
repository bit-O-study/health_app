import { describe, expect, it } from "vitest";

import {
  parseLightModePreference,
  resolveLightMode,
} from "@/features/performance/light-mode";

describe("light mode", () => {
  it("저장값은 명시적 경량 모드만 허용한다", () => {
    expect(parseLightModePreference("light")).toBe("light");
    expect(parseLightModePreference("auto")).toBe("auto");
    expect(parseLightModePreference("invalid")).toBe("auto");
    expect(parseLightModePreference(null)).toBe("auto");
  });

  it("사용자가 켜면 기기 성능과 관계없이 경량 모드를 사용한다", () => {
    expect(resolveLightMode("light", { deviceMemory: 8, cores: 8 })).toBe(true);
  });

  it("자동 모드는 저사양 또는 모션 감소 환경에서만 적용한다", () => {
    expect(resolveLightMode("auto", { deviceMemory: 2, cores: 8 })).toBe(true);
    expect(resolveLightMode("auto", { deviceMemory: 8, cores: 4 })).toBe(true);
    expect(resolveLightMode("auto", { deviceMemory: 8, cores: 8, reducedMotion: true })).toBe(true);
    expect(resolveLightMode("auto", { deviceMemory: 8, cores: 8 })).toBe(false);
  });
});
