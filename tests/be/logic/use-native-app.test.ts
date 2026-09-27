import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isNativeApp } from "@/lib/platform/is-native-app";
import { useNativeApp } from "@/lib/platform/use-native-app";

function CaptureMode() {
  return createElement("input", {
    type: "file",
    capture: useNativeApp() ? "environment" : undefined,
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("native capture hydration", () => {
  it("keeps the server snapshot identical even when native globals exist", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", { userAgent: "helssu-app" });
    expect(isNativeApp()).toBe(true);
    expect(renderToString(createElement(CaptureMode))).not.toContain("capture=");
  });

  it("renders on the server without browser globals", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("navigator", undefined);
    expect(renderToString(createElement(CaptureMode))).toContain('type="file"');
  });
});
