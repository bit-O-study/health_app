import { expect, test } from "@playwright/test";

// 런닝 모드(/running)는 휴대폰 전용 숨은 라우트.
// 기본 프로젝트는 모바일(Pixel 7)이라, 각 테스트는 필요한 디바이스 컨텍스트를
// 직접 만들어 게이트 동작을 결정적으로 검증한다.

test("데스크톱(비터치·넓은 화면)에서 /running 은 휴대폰 전용 안내를 보여준다", async ({
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
  await page.goto("/running", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "런닝 모드는 휴대폰 전용입니다" }),
  ).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("button", { name: "시작하기" })).toHaveCount(0);
  await ctx.close();
});

test("모바일(터치)에서는 모드선택(실내/야외)이 뜨고, 실내 고르면 게임 인트로", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();
  await page.goto("/running", { waitUntil: "domcontentloaded" });

  // 모드 선택 — 실내/야외
  await expect(page.getByRole("heading", { name: "런닝 모드" })).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByRole("button", { name: /실내 런닝/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /야외 런닝/ })).toBeVisible();

  // 실내 선택 → 카메라 게임 인트로
  await page.getByRole("button", { name: /실내 런닝/ }).click();
  await expect(page.getByRole("heading", { name: "런닝 모드 🏃" })).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByRole("button", { name: "시작하기" })).toBeVisible();
  await ctx.close();
});

test("모바일에서 야외 런닝을 고르면 GPS 인트로가 뜬다", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();
  await page.goto("/running", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /야외 런닝/ }).click();
  await expect(page.getByRole("heading", { name: "야외 런닝 📍" })).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByRole("button", { name: "시작하기" })).toBeVisible();
  await ctx.close();
});

test("시작 화면의 '나가기'로 모드 선택으로 돌아온다(실내/야외)", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();
  await page.goto("/running", { waitUntil: "domcontentloaded" });

  // 야외 → 나가기 → 모드 선택
  await page.getByRole("button", { name: /야외 런닝/ }).click();
  await expect(page.getByRole("heading", { name: "야외 런닝 📍" })).toBeVisible({
    timeout: 5000,
  });
  await page.getByRole("button", { name: /나가기/ }).click();
  await expect(page.getByRole("heading", { name: "런닝 모드" })).toBeVisible();

  // 실내 → 나가기 → 모드 선택
  await page.getByRole("button", { name: /실내 런닝/ }).click();
  await expect(page.getByRole("heading", { name: "런닝 모드 🏃" })).toBeVisible({
    timeout: 5000,
  });
  await page.getByRole("button", { name: /나가기/ }).click();
  await expect(page.getByRole("button", { name: /야외 런닝/ })).toBeVisible();
  await ctx.close();
});
