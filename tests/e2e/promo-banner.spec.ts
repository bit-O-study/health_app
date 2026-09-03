import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";

test("메인 광고 배너가 사진 중심 레이아웃과 직접 이동 점을 제공한다", async ({ page }) => {
  await signUpAndOnboard(page);
  await page.goto("/home", { waitUntil: "networkidle" });

  const banner = page.getByRole("region", { name: "함께하는 서비스" });
  await expect(banner).toBeVisible();
  const image = banner.locator("img");
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", /promo%2Fiq-test-photo\.webp|promo\/iq-test-photo\.webp/);
  // next/image는 모바일 폭에 맞춘 최적화 소스를 내려준다. 원본 크기가 아니라 실제 로드 성공을 검증한다.
  expect(await image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  const link = banner.getByRole("link");
  expect(await link.evaluate((el) => parseFloat(getComputedStyle(el).borderRadius))).toBeLessThanOrEqual(8);

  const second = banner.getByRole("button", { name: /2번 배너/ });
  await second.click();
  await expect(second).toHaveAttribute("aria-current", "true");
  await expect(banner.getByRole("link")).toHaveAttribute("href", /whisky-app/);
});
