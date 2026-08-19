import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * SAFE-AREA GUARD — 상태바(상단)·홈버튼/제스처바(하단)와 UI 가 겹치지 않게,
 * 화면 가장자리에 붙는(full-screen 오버레이 / 고정 바 / 바텀시트) 컴포넌트가
 * safe-area 인셋을 갖고 있는지 소스에서 검사한다.
 *
 * 배경: body 는 전역으로 padding-top/bottom(env(safe-area-inset-*)) 을 주므로 일반 흐름은
 * 안전하지만, position:fixed/absolute/sticky 로 가장자리에 붙는 요소는 그 패딩을 벗어나
 * 상태바·제스처바와 겹친다. 각 화면을 매번 눈으로 확인하기 어려워 회귀를 자동 가드한다.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../../../src");
const read = (rel: string) => readFileSync(resolve(SRC, rel), "utf8");

// 전면(full-screen) 러닝 오버레이 — 상단 HUD/컨트롤 + 하단 컨트롤 모두 인셋 필요.
const FULLSCREEN_TOP_AND_BOTTOM = [
  "features/running/running-game.tsx",
  "features/running/outdoor-run.tsx",
  "features/running/zen-run.tsx",
];

// 하단에 컨트롤/입력/버튼이 붙는 오버레이·시트·고정 바 — 하단 인셋 필요.
const NEEDS_BOTTOM_INSET = [
  "features/running/running-game.tsx",
  "features/running/outdoor-run.tsx",
  "features/running/zen-run.tsx",
  "features/workout-timer/guided-workout.tsx",
  "features/workout-timer/muscle-body-view.tsx",
  "features/groups/components/proof-recorder.tsx",
  "features/groups/components/proof-member-sheet.tsx",
  "features/groups/components/group-proof-board.tsx",
  "features/community/components/post-detail.tsx",
  "components/bottom-nav.tsx",
  "features/routine/components/today-focus-menu.tsx",
  "features/routine/components/today-adjust-menu.tsx",
];

// 상단에 헤더/HUD 가 붙는 전면 오버레이 — 상단 인셋 필요.
const NEEDS_TOP_INSET = [
  "features/running/running-game.tsx",
  "features/running/outdoor-run.tsx",
  "features/running/zen-run.tsx",
  "features/workout-timer/guided-workout.tsx",
  "features/groups/components/proof-recorder.tsx",
  "features/groups/components/group-board.tsx",
];

const hasBottomInset = (src: string) =>
  src.includes("safe-area-inset-bottom");
const hasTopInset = (src: string) => src.includes("safe-area-inset-top");

describe("safe-area 가드 — 하단(홈버튼/제스처바) 겹침 방지", () => {
  for (const f of NEEDS_BOTTOM_INSET) {
    it(`${f} 는 하단 safe-area 인셋을 포함한다`, () => {
      expect(hasBottomInset(read(f)), `${f} missing safe-area-inset-bottom`).toBe(
        true,
      );
    });
  }
});

describe("safe-area 가드 — 상단(상태바) 겹침 방지", () => {
  for (const f of NEEDS_TOP_INSET) {
    it(`${f} 는 상단 safe-area 인셋을 포함한다`, () => {
      expect(hasTopInset(read(f)), `${f} missing safe-area-inset-top`).toBe(true);
    });
  }
});

describe("safe-area 가드 — 전면 러닝 오버레이는 상·하단 모두", () => {
  for (const f of FULLSCREEN_TOP_AND_BOTTOM) {
    it(`${f} 는 상·하단 인셋을 모두 포함한다`, () => {
      const src = read(f);
      expect(hasTopInset(src), `${f} missing top inset`).toBe(true);
      expect(hasBottomInset(src), `${f} missing bottom inset`).toBe(true);
    });
  }
});

describe("safe-area 가드 — 커뮤니티 댓글바는 하단탭+제스처바 위로", () => {
  // 하단탭 높이는 bottom-nav 가 정의한다(3.75rem). 값을 하드코딩하지 않고 거기서 읽어와,
  // 탭 높이를 바꿔도 '댓글바가 탭에 가려지는지'만 계속 검사하게 한다.
  it("post-detail 댓글 입력바가 하단탭 높이+safe-area 오프셋을 쓴다", () => {
    const nav = read("components/bottom-nav.tsx");
    const navHeight = nav.match(/calc\((\d+(?:\.\d+)?rem) \+ env\(safe-area-inset-bottom\)\)/);
    expect(navHeight, "bottom-nav 하단탭 높이를 못 찾음").not.toBeNull();
    const src = read("features/community/components/post-detail.tsx");
    expect(src).toContain(
      `bottom-[calc(${navHeight![1]}+env(safe-area-inset-bottom))]`,
    );
  });
});
