import { describe, expect, it } from "vitest";

import { PROMO_APPS, otherApps } from "@/features/cross-promo/apps";

describe("cross-promo apps", () => {
  it("세 앱(health·iq·whisky)이 모두 https URL 을 가진다", () => {
    const keys = PROMO_APPS.map((a) => a.key).sort();
    expect(keys).toEqual(["health", "iq", "whisky"]);
    for (const a of PROMO_APPS) {
      expect(a.url).toMatch(/^https:\/\//);
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.emoji.length).toBeGreaterThan(0);
    }
  });

  it("otherApps 는 자기 자신을 뺀 정확히 2개를 반환한다", () => {
    for (const self of ["health", "iq", "whisky"] as const) {
      const others = otherApps(self);
      expect(others).toHaveLength(2);
      expect(others.some((a) => a.key === self)).toBe(false);
    }
  });
});