import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 전체화면 오버레이에 **바깥 간격이 새지 않게** 지키는 가드.
 *
 * 2026-09-25 실측 버그: 식단의 '아침 추가' 전체화면 시트가 화면보다 20px 짧아
 * 아래쪽에 하단 탭이 비쳐 보였다(측정: 높이 819 / 뷰포트 839).
 *
 * 원인은 시트를 그리는 자리가 `<main className="app-container space-y-5">` 안이라,
 * Tailwind 의 `space-y-*` 가 **오버레이에도 margin 을 얹었기** 때문이다.
 * `position: fixed; inset: 0` 라도 margin 이 있으면 그만큼 상자가 줄어든다.
 *
 * → 간격이 걸린 컨테이너 안에서 그리는 `fixed inset-0` 오버레이는 `m-0` 으로 끊는다.
 *   (`space-y-*` 는 `:where()` 라 특정도가 0이어서 `m-0` 이 이긴다.)
 *
 * ⚠ 파일 전체를 훑어 "space-y 를 쓰는 파일의 모든 오버레이"를 잡으면 오탐이 많다
 *   — 오버레이가 그 컨테이너의 자식인지는 소스만 봐서는 알 수 없다. 그래서 실제로
 *   물렸던 자리만 못 박고, 화면 크기 자체는 E2E(`food-search-egg-serving`: 시트가
 *   뷰포트를 꽉 채우는지)가 지킨다.
 */

const DIET_BOARD = join(
  process.cwd(),
  "src/features/diet/components/diet-board.tsx",
);

describe("식단 오버레이는 부모 간격을 물려받지 않는다", () => {
  const src = readFileSync(DIET_BOARD, "utf8");

  it("간격이 걸린 컨테이너 안에서 그린다 (가드의 전제)", () => {
    expect(src).toMatch(/className="app-container space-y-\d/);
  });

  it("fixed inset-0 오버레이는 전부 m-0 이다", () => {
    const bad: string[] = [];
    src.split("\n").forEach((line, i) => {
      if (!/\bfixed\b[^"]*\binset-0\b/.test(line)) return;
      if (/\bm-0\b/.test(line)) return;
      bad.push(`diet-board.tsx:${i + 1}`);
    });
    expect(bad, "부모 space-y 의 margin 이 시트에 얹혀 화면을 다 못 덮는다").toEqual([]);
  });
});
