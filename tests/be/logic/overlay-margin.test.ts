import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 전체화면 오버레이에 **바깥 간격이 새지 않게** 지키는 가드.
 *
 * 2026-09-25 실측 버그: 식단의 '아침 추가' 전체화면 시트가 화면보다 20px 짧아
 * 아래로 하단 탭이 비쳐 보였다(측정: 높이 819 / 뷰포트 839).
 *
 * 원인은 시트를 그리는 자리가 `<main className="app-container space-y-5">` **안**이라,
 * Tailwind 의 `space-y-*` 가 오버레이에도 margin 을 얹은 것이다.
 * `position: fixed; inset: 0` 라도 margin 이 있으면 그만큼 상자가 줄어든다.
 * (조상에 transform·backdrop-filter 가 없는데 fixed 가 화면을 안 채우면 이걸 의심한다.)
 *
 * → 간격이 걸린 컨테이너 **안에서** 그리는 `fixed inset-0` 오버레이는 `m-0` 으로 끊는다.
 *   `space-y-*` 는 `:where()` 라 특정도가 0이어서 `m-0` 이 이긴다.
 *
 * ⚠ "같은 파일에 space-y 가 있다"로 잡으면 오탐이 15건 나온다(실측으로 확인했다) —
 *   대부분의 오버레이는 그 컨테이너의 자식이 아니다. 그래서 **들여쓰기로 중첩을 본다.**
 */

const ROOT = process.cwd();

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const indentOf = (line: string) => line.length - line.trimStart().length;

/** 오버레이 줄을 감싸는 `space-y-*` 컨테이너를 찾는다(없으면 null). */
function spacedAncestor(lines: string[], at: number): string | null {
  let depth = indentOf(lines[at]);
  for (let j = at - 1; j >= 0; j -= 1) {
    const line = lines[j];
    if (!line.trim()) continue;
    const ind = indentOf(line);
    if (ind >= depth) continue;
    depth = ind;
    if (/className="[^"]*\bspace-y-\d/.test(line)) return line.trim();
    if (ind === 0) break;
  }
  return null;
}

describe("전체화면 오버레이 간격 가드", () => {
  const files = tsxFiles(join(ROOT, "src"));

  it("소스를 찾았다 (가드가 빈손으로 통과하지 않게)", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("간격 컨테이너 안의 fixed inset-0 오버레이는 m-0 을 갖는다", () => {
    const bad: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, i) => {
        if (!/\bfixed\b[^"]*\binset-0\b/.test(line)) return;
        if (/\bm-0\b/.test(line)) return;
        if (!spacedAncestor(lines, i)) return;
        bad.push(`${relative(ROOT, file).split(sep).join("/")}:${i + 1}`);
      });
    }
    expect(bad, "부모의 space-y margin 이 오버레이에 얹혀 화면을 다 못 덮는다").toEqual([]);
  });

  it("실제로 물렸던 식단 오버레이는 계속 m-0 이다", () => {
    const src = readFileSync(
      join(ROOT, "src/features/diet/components/diet-board.tsx"),
      "utf8",
    );
    const overlays = src
      .split("\n")
      .filter((l) => /\bfixed\b[^"]*\binset-0\b/.test(l));
    expect(overlays.length).toBeGreaterThan(0);
    expect(overlays.every((l) => /\bm-0\b/.test(l))).toBe(true);
  });
});
