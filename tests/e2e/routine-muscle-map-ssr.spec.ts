import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";

// 회귀: 운동탭 '자극 부위' 인체 그림이 클라이언트에서만 그려져(ssr:false),
// 화면이 **그 자리만 빈 칸인 채로 먼저 뜨고** 잠시 뒤 툭 나타났다.
// 서버 HTML 에 이미 들어 있어야 화면이 한 번에 완성된 상태로 도착한다.

test("운동탭 '자극 부위' 인체 그림이 서버 HTML 에 들어 있다", async ({ page }) => {
  await signUpAndOnboard(page);

  // 브라우저가 아니라 **서버가 내려준 HTML** 을 그대로 받아 검사한다
  // (로그인 쿠키는 page 컨텍스트에 있으므로 page.request 로 요청).
  const res = await page.request.get("/routine");
  expect(res.status()).toBe(200);
  const html = await res.text();

  expect(html).toContain("자극 부위");
  // react-body-highlighter 가 그리는 인체 SVG 래퍼 — 서버 렌더 결과에 있어야 한다.
  expect(html, "자극 부위 인체 그림이 서버 HTML 에 없음(클라 전용 렌더로 되돌아감)").toContain(
    "rbh-wrapper",
  );
});
