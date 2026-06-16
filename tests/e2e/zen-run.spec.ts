import { expect, test } from "@playwright/test";

// 힐링 러닝(/jog) — 카메라 없이 모션으로 달리기를 감지하는 숨은 콘텐츠.
// 접근 게이트가 없어 어떤 기기에서도 인트로가 떠야 한다(휴대폰 전용 차단 없음).

test("모바일에서 힐링 러닝 인트로가 뜬다", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();
  await page.goto("/jog", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /힐링 러닝/ })).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByRole("button", { name: "시작하기" })).toBeVisible();
  await ctx.close();
});

test("데스크톱에서도 힐링 러닝은 접근 차단 없이 인트로가 뜬다", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    hasTouch: false,
    isMobile: false,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();
  await page.goto("/jog", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /힐링 러닝/ })).toBeVisible({
    timeout: 5000,
  });
  // 런닝모드와 달리 '휴대폰 전용' 안내가 없어야 한다.
  await expect(page.getByText("휴대폰 전용")).toHaveCount(0);
  await ctx.close();
});
