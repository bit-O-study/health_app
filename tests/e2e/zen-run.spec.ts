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

test("센서(흔들림)로만 캐릭터가 앞으로 간다 — 터치로는 안 움직인다", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  await page.goto("/jog", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "시작하기" }).click();
  await page.waitForTimeout(800);

  const distText = page.locator("text=/\\d+ m/").first();

  // 1) 화면을 눌러도(터치) 움직이지 않아야 한다.
  await page.mouse.move(200, 600);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  expect(parseInt(await distText.innerText(), 10)).toBe(0);

  // 2) 모션 센서(흔들림) 이벤트를 주입하면 전진해야 한다.
  await page.evaluate(() => {
    let i = 0;
    const w = window as unknown as { __inj?: ReturnType<typeof setInterval> };
    w.__inj = setInterval(() => {
      const y = i++ % 2 ? 19 : 1; // 크게 위아래로 — 달리기 흔들림
      window.dispatchEvent(
        new DeviceMotionEvent("devicemotion", {
          accelerationIncludingGravity: { x: 0, y, z: 0 },
        }),
      );
    }, 30);
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const w = window as unknown as { __inj?: ReturnType<typeof setInterval> };
    if (w.__inj) clearInterval(w.__inj);
  });
  expect(parseInt(await distText.innerText(), 10)).toBeGreaterThan(0);
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
