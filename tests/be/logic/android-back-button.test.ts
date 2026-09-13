import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 안드로이드 뒤로가기 → 이전 화면(2026-09-14).
 *
 * 🔴 Capacitor 코어는 뒤로가기를 처리하지 않는다. 처리 코드가 없으면 뒤로가기 한 번에
 * **앱이 닫힌다.** 네이티브 코드라 단위 실행은 못 하므로 소스에 처리가 남아 있는지 지킨다.
 */
const activity = fs.readFileSync(
  path.join(
    process.cwd(),
    "android/app/src/main/java/app/helssu/twa/MainActivity.java",
  ),
  "utf8",
);

describe("안드로이드 뒤로가기", () => {
  it("뒤로가기 콜백을 등록한다", () => {
    expect(activity).toContain("getOnBackPressedDispatcher().addCallback(");
    expect(activity).toContain("import androidx.activity.OnBackPressedCallback;");
  });

  it("이전 화면이 있으면 WebView 히스토리를 되돌린다", () => {
    expect(activity).toMatch(/wv\.canGoBack\(\)\)\s*\{\s*wv\.goBack\(\);/);
  });

  it("첫 화면이면 콜백을 잠시 끄고 기본 동작(앱 닫기)으로 넘긴다 — 무한 루프 방지", () => {
    expect(activity).toMatch(
      /setEnabled\(false\);\s*getOnBackPressedDispatcher\(\)\.onBackPressed\(\);\s*setEnabled\(true\);/,
    );
  });
});
