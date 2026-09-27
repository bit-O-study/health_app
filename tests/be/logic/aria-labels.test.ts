import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 운동탭 랜드마크 이름 가드 (2026-09-19).
 *
 * 무슨 일이 있었나 — 화면 재설계로 운동탭 머리글에 `<nav aria-label="운동 도구">` 가
 * 생겼다. 운동 고르기 목록의 버튼은 예전부터 `aria-label="운동"` 이다.
 * 접근성 이름 찾기는 **부분 일치**라("운동" ⊂ "운동 도구") `getByLabel("운동")` 이
 * 두 개로 잡혔고, 운동을 담는 E2E 12개가 한꺼번에 깨졌다.
 * 스크린리더 사용자도 같은 일을 겪는다 — "운동" 을 찾으면 랜드마크가 먼저 걸린다.
 *
 * 왜 운동탭만 보는가 — 다른 화면의 `오늘의 운동 바로가기`·`추천 대체운동` 같은 이름은
 * 테스트가 role+name 으로 **정확히** 집어 쓰고 있어 문제가 없다. 사고가 난 건
 * "그 화면에서 짧은 컨트롤 이름(`운동`)을 랜드마크가 품은" 경우 하나다.
 */
const ROOT = process.cwd();

describe("운동탭 랜드마크 이름", () => {
  it('운동탭의 랜드마크 이름에 "운동" 이 들어가지 않는다', () => {
    const src = readFileSync(resolve(ROOT, "src/app/routine/page.tsx"), "utf8");
    const landmarks = [...src.matchAll(/<(nav|header|main|aside|section|form)\b[^>]*?aria-label="([^"{}]+)"/g)]
      .map((m) => m[2].trim());
    expect(landmarks.length).toBeGreaterThan(0);
    for (const label of landmarks) {
      expect(label, `랜드마크 "${label}" 가 aria-label="운동" 버튼을 가린다`).not.toContain("운동");
    }
  });
});
