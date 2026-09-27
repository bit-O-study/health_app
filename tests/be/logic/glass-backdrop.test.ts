import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * GLASS 가드 — 반투명 블러 막대(하단 탭·상단 머리글)의 `backdrop-filter` 회귀 방지.
 *
 * 2026-09-25 실측 버그: `backdrop-filter` 를 먼저, `-webkit-backdrop-filter` 를 나중에
 * 쓰면 빌드(Lightning CSS)가 **표준 속성을 지워 버리고 `-webkit-` 만 남긴다**.
 * 크롬·안드로이드 WebView 는 그 상태에서 블러를 걸지 않아, 78% 반투명만 남은 탭 바
 * 뒤로 본문 글자가 또렷이 비쳤다(홈 화면 "이번 주 요약" 숫자가 탭 라벨과 겹쳐 보임).
 *
 * → 손으로 쓴 CSS 에서는 **`-webkit-` 을 먼저, 표준 속성을 나중에** 선언한다.
 *   (Tailwind 의 `backdrop-blur-*` 유틸리티는 둘 다 내보내므로 그대로 써도 된다.)
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC = join(ROOT, "src");

function cssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...cssFiles(full));
    else if (name.endsWith(".css")) out.push(full);
  }
  return out;
}

describe("backdrop-filter 선언 순서", () => {
  const files = cssFiles(SRC);

  it("프로젝트 CSS 를 찾는다", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    const src = readFileSync(file, "utf8");
    const lines = src.split(/\r?\n/);

    it(`${rel}: 표준 backdrop-filter 는 -webkit- 보다 뒤에 온다`, () => {
      const wrong: string[] = [];
      lines.forEach((line, i) => {
        if (!/^\s*backdrop-filter\s*:/.test(line)) return;
        // 바로 다음 줄에 -webkit- 이 오면 빌드가 표준 속성을 지운다.
        if (/^\s*-webkit-backdrop-filter\s*:/.test(lines[i + 1] ?? "")) {
          wrong.push(`${rel}:${i + 1}`);
        }
      });
      expect(wrong, "-webkit- 을 먼저 쓰고 표준 속성을 뒤에 쓸 것").toEqual([]);
    });

    it(`${rel}: 블러를 쓰면 -webkit- 과 표준 속성을 모두 선언한다`, () => {
      const std = (src.match(/(?<!-webkit-)backdrop-filter\s*:/g) ?? []).length;
      const webkit = (src.match(/-webkit-backdrop-filter\s*:/g) ?? []).length;
      expect(std, `${rel}: 표준/webkit 선언 수가 다르다`).toBe(webkit);
    });
  }
});
