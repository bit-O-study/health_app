import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import { BRAND_NAME, BRAND_TAGLINE } from "@/features/brand/logo";
import { BRAND_ICON_BG, BRAND_ICON_MINT } from "@/features/brand/mark";

/**
 * 앱 이름 짐꾼 · 바벨 ㅈ 로고 (2026-09-29, docs/jimkkun-logo-review-2026-09-29.html).
 */

const read = (p: string) => readFileSync(p, "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("앱 이름 — 짐꾼", () => {
  it("브랜드 이름과 한 줄 소개", () => {
    expect(BRAND_NAME).toBe("짐꾼");
    expect(BRAND_TAGLINE).toBe("내가 쓰려고 만든 헬스앱");
  });

  it("🔴 화면 코드에 옛 이름(헬쑤)이 남지 않는다", () => {
    const left = walk("src").filter((f) => read(f).includes("헬쑤"));
    expect(left).toEqual([]);
  });

  it("PWA 매니페스트 이름·색이 짐꾼 초록", () => {
    const m = manifest();
    expect(m.name).toBe("짐꾼");
    expect(m.short_name).toBe("짐꾼");
    expect(m.theme_color).toBe("#087f5b");
  });

  it("안드로이드 표시 이름은 짐꾼, 🔴 앱 ID 는 그대로(바꾸면 기존 설치 앱이 업데이트되지 않는다)", () => {
    const strings = read("android/app/src/main/res/values/strings.xml");
    expect(strings).toContain('<string name="app_name">짐꾼</string>');
    expect(strings).toContain('<string name="package_name">app.helssu.twa</string>');
    const cap = read("capacitor.config.ts");
    expect(cap).toContain('appName: "짐꾼"');
    expect(cap).toContain('appId: "app.helssu.twa"');
    // 네이티브 브리지 우회용 — 지우거나 바꾸면 걸음수 등 플러그인이 죽는다.
    expect(cap).toContain('appendUserAgent: "helssu-app"');
  });
});

describe("로고 — 바벨 ㅈ", () => {
  it("🔴 앱 안 마크(mark.tsx)와 아이콘 PNG 스크립트(render-icons.mjs)가 같은 도형을 쓴다", () => {
    const mark = read("src/features/brand/mark.tsx");
    const script = read("tools/brand/render-icons.mjs");
    const coords = [
      'x1="15" y1="34" x2="85" y2="34"',
      'x="21" y="21" width="7" height="26" rx="2.2"',
      'x="29.5" y="26" width="4.5" height="16" rx="1.6"',
      'x="72" y="21" width="7" height="26" rx="2.2"',
      'x="66" y="26" width="4.5" height="16" rx="1.6"',
      'd="M50 44 L31 78 M50 44 L69 78"',
    ];
    for (const c of coords) {
      expect(mark, c).toContain(c);
      expect(script, c).toContain(c);
    }
    expect(script).toContain(`BG = "${BRAND_ICON_BG}"`);
    expect(script).toContain(`MINT = "${BRAND_ICON_MINT}"`);
  });

  it("PWA 아이콘 버전이 스크립트·레이아웃·매니페스트에서 같다(바뀐 아이콘을 브라우저가 새로 받게)", () => {
    const version = /ICON_VERSION = "(\d+)"/.exec(read("tools/brand/render-icons.mjs"))?.[1];
    expect(version).toBeTruthy();
    expect(read("src/app/layout.tsx")).toContain(`PWA_ICON_VERSION = "${version}"`);
    expect(read("src/app/manifest.ts")).toContain(`PWA_ICON_VERSION = "${version}"`);
    for (const f of ["icon-192", "icon-512", "icon-512-maskable", "apple-touch-icon"]) {
      expect(statSync(`public/${f}-${version}.png`).size).toBeGreaterThan(1000);
    }
  });
});
