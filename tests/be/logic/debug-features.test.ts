import { describe, expect, it } from "vitest";

import {
  DEBUG_FEATURES,
  DEBUG_VISIBILITIES,
  addDebugAccount,
  debugSettingKey,
  debugValueEnabled,
  debugValueToVisibility,
  isDebugVisibility,
  normalizeDebugAccounts,
  removeDebugAccount,
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

describe("debugValueToVisibility — 3단계(숨김/디버그/공개), 기본 debug", () => {
  it("미설정/null/true = debug (디버그 계정만)", () => {
    expect(debugValueToVisibility(undefined)).toBe("debug");
    expect(debugValueToVisibility(null)).toBe("debug");
    expect(debugValueToVisibility(true)).toBe("debug");
    expect(debugValueToVisibility("debug")).toBe("debug");
  });
  it('"public" = 전체 공개', () => {
    expect(debugValueToVisibility("public")).toBe("public");
  });
  it('false(구버전 꺼짐)·"hidden" = 숨김', () => {
    expect(debugValueToVisibility(false)).toBe("hidden");
    expect(debugValueToVisibility("hidden")).toBe("hidden");
  });
});

describe("isDebugVisibility", () => {
  it("3개 값만 통과", () => {
    for (const v of DEBUG_VISIBILITIES) expect(isDebugVisibility(v)).toBe(true);
    expect(isDebugVisibility("nope")).toBe(false);
    expect(isDebugVisibility(true)).toBe(false);
    expect(isDebugVisibility(null)).toBe(false);
  });
});

describe("debug accounts list — normalize/add/remove", () => {
  it("normalizes: lowercases, trims, dedupes, drops non-strings/blank", () => {
    expect(
      normalizeDebugAccounts([" A@X.com ", "a@x.com", "", 5, "b@y.com"]),
    ).toEqual(["a@x.com", "b@y.com"]);
  });
  it("normalize on non-array = []", () => {
    expect(normalizeDebugAccounts(null)).toEqual([]);
    expect(normalizeDebugAccounts("a@x.com")).toEqual([]);
  });
  it("add appends normalized email without duplicating", () => {
    expect(addDebugAccount(["a@x.com"], "B@Y.com")).toEqual([
      "a@x.com",
      "b@y.com",
    ]);
    expect(addDebugAccount(["a@x.com"], "a@x.com")).toEqual(["a@x.com"]);
  });
  it("add rejects invalid email (null)", () => {
    expect(addDebugAccount([], "not-an-email")).toBeNull();
    expect(addDebugAccount([], "  ")).toBeNull();
  });
  it("remove is case-insensitive and keeps the rest", () => {
    expect(removeDebugAccount(["a@x.com", "b@y.com"], "A@X.com")).toEqual([
      "b@y.com",
    ]);
  });
});
