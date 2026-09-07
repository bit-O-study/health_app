import { expect, test } from "@playwright/test";

/**
 * 404 화면과 응답 보안 헤더.
 *
 * 둘 다 **로그인이 필요 없다** — 없는 주소는 미들웨어의 로그인 리다이렉트보다 먼저
 * 라우터가 처리하고, 헤더는 모든 응답에 붙는다. DB 계정이 없어도 도는 몇 안 되는 스펙.
 */

test("없는 주소는 한국어 404 화면 — Next 기본 영어 화면이 아니다", async ({ page }) => {
  const res = await page.goto("/이런페이지는없다-404-check", {
    waitUntil: "domcontentloaded",
  });

  expect(res?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "페이지를 찾을 수 없어요" }),
  ).toBeVisible();
  // Next 기본 404 가 새어 나오면 이 문구가 보인다.
  await expect(page.getByText("This page could not be found")).toHaveCount(0);
});

test("404 에서 나가는 길이 있다 — 뒤로 · 홈으로", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.goto("/없는주소-back-check", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("link", { name: /홈으로/ })).toBeVisible();

  // 뒤로 → 직전 화면(/login)
  await page.getByRole("button", { name: "뒤로" }).click();
  await page.waitForURL("**/login");
});

test("모든 응답에 보안 헤더가 붙는다", async ({ page }) => {
  const res = await page.goto("/login", { waitUntil: "domcontentloaded" });
  const h = res?.headers() ?? {};

  expect(h["x-frame-options"]).toBe("SAMEORIGIN");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  // 쓰는 권한만 self, 안 쓰는 마이크는 닫혀 있다.
  expect(h["permissions-policy"]).toContain("camera=(self)");
  expect(h["permissions-policy"]).toContain("microphone=()");
  // 로컬 dev(http)에는 HSTS 를 붙이지 않는다 — 붙으면 localhost 가 https 로만 열린다.
  expect(h["strict-transport-security"]).toBeUndefined();
});
