import { describe, expect, it } from "vitest";

import {
  DEBUG_FEATURES,
  debugSettingKey,
  debugValueEnabled,
} from "@/features/admin/debug-features";

describe("debug feature registry", () => {
  it("has unique ids", () => {
    const ids = DEBUG_FEATURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("registers the steps diagnostic feature", () => {
    expect(DEBUG_FEATURES.some((f) => f.id === "steps")).toBe(true);
  });

  it("every feature has a non-empty label", () => {
    for (const f of DEBUG_FEATURES) {
      expect(f.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("debugSettingKey", () => {
  it("namespaces under debug.", () => {
    expect(debugSettingKey("steps")).toBe("debug.steps");
  });
});

describe("debugValueEnabled — default on, only false disables", () => {
  it("unset (null/undefined) = enabled", () => {
    expect(debugValueEnabled(null)).toBe(true);
    expect(debugValueEnabled(undefined)).toBe(true);
  });
  it("explicit false = disabled", () => {
    expect(debugValueEnabled(false)).toBe(false);
  });
  it("true = enabled", () => {
    expect(debugValueEnabled(true)).toBe(true);
  });
  it("any other value = enabled", () => {
    expect(debugValueEnabled(0)).toBe(true);
    expect(debugValueEnabled("off")).toBe(true);
  });
});
