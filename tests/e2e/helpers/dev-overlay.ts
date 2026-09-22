import type { Page } from "@playwright/test";

/**
 * Next dev 오버레이 무력화 (2026-09-20).
 *
 * `pnpm dev` 로 띄운 서버에는 `<nextjs-portal>` 이 붙는다(이슈 배지·라우트 표시).
 * 이게 **화면 왼쪽 아래**에 떠서 하단 탭 클릭을 가로챈다:
 *
 *   `<nextjs-portal> ... intercepts pointer events` → 클릭이 30초 동안 재시도만 하다 실패
 *
 * 프로덕션 빌드엔 없는 개발 도구라, E2E 에선 포인터 이벤트만 꺼 준다.
 * (요소를 지우면 Next 가 다시 그려서 경쟁이 난다 — 그래서 CSS 로 막는다.)
 *
 * 쓰는 법: `await silenceDevOverlay(page)` 를 **첫 goto 전에** 한 번.
 */
export async function silenceDevOverlay(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const STYLE_ID = "__e2e_dev_overlay_off";
    const inject = () => {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      // 호스트에서 끄면 섀도 DOM 안쪽까지 따라 꺼진다(안에서 다시 켜지 않는 한).
      style.textContent =
        "nextjs-portal, nextjs-portal * { pointer-events: none !important; }";
      (document.head ?? document.documentElement).appendChild(style);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inject, { once: true });
    } else {
      inject();
    }
  });
}
