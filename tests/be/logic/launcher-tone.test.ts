import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { LAUNCHER_APPS as APPS, APP_TONE } from "@/features/launcher/apps";

/** 앱 아이콘 판은 브랜드 한 색의 옅은 면 + 단색 선 아이콘이다 — 앱마다 다른 그라데이션을 쓰지 않는다(2026-11-18 리디자인). */
describe("앱 아이콘 색은 브랜드 한 가지", () => {
  it("모든 앱이 같은 톤을 쓴다", () => {
    expect(APPS.length).toBeGreaterThan(0);
    for (const app of APPS) expect(app.tone).toBe(APP_TONE);
    expect(APP_TONE).not.toContain("gradient");
  });

  it("그리는 쪽이 흰 글자·그림자를 덧씌우지 않는다", () => {
    for (const f of [
      "src/features/launcher/components/app-grid.tsx",
      "src/features/launcher/home-dock-editor.tsx",
      "src/features/launcher/components/app-widget.tsx",
    ]) {
      const src = readFileSync(resolve(process.cwd(), f), "utf8");
      const lines = src.split("\n").filter((l) => l.includes("app.tone"));
      expect(lines.length, f).toBeGreaterThan(0);
      for (const l of lines) expect(l, f).not.toMatch(/text-white|shadow-sm/);
    }
  });
});
