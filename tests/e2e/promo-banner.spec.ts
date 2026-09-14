import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { hasDb } from "./helpers/db";

// 2026-09-14 화면 간결화: 광고는 홈 맨 위 154px 사진 배너 → **맨 아래 한 줄**(사용자 결정).

test("홈 광고는 맨 아래 한 줄로 뜨고, 사진이 로드되며 자동으로 넘어간다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await createOnboardedAccount(page);
  await page.goto("/home", { waitUntil: "networkidle" });

  const banner = page.getByRole("region", { name: "함께하는 서비스" });
  await expect(banner).toBeVisible();

  // 맨 아래 — 홈 본문의 마지막 블록이다(내 기록보다 먼저 보이지 않게).
  await expect(page.getByRole("main").locator(":scope > :last-child")).toHaveAttribute(
    "data-testid",
    "promo-banner",
  );

  // 한 줄 — 예전 사진 배너(154px)가 아니다.
  const box = await banner.boundingBox();
  expect(box?.height ?? 999).toBeLessThan(80);

  const image = banner.locator("img");
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", /promo%2Fiq-test-photo\.webp|promo\/iq-test-photo\.webp/);
  // next/image 는 크기에 맞춘 최적화 소스를 내려준다. 원본 크기가 아니라 실제 로드 성공을 검증한다.
  expect(await image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  const link = banner.getByRole("link");
  await expect(link).toHaveAttribute("href", /iq-test/);
  // 자동 롤링(4.5초)으로 다음 서비스로 넘어간다.
  await expect(link).toHaveAttribute("href", /whisky-app/, { timeout: 10_000 });
});
