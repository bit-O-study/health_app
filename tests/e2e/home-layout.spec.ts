import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { hasDb } from "./helpers/db";

// 2026-09-14 화면 간결화 — 홈은 광고 배너(맨 위, 원상복구) → 목표 → 오늘 → 이번 주 → 잔디.
// 날씨 배경은 카드에 가려 안 보이는데 위치 권한만 물어서 뺐다.

test("홈: 블록 순서가 광고 배너 → 오늘 → 잔디이고, 권한 줄은 하나뿐이다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await createOnboardedAccount(page);
  await page.goto("/home", { waitUntil: "networkidle" });

  const today = page.getByTestId("home-today");
  await expect(today).toBeVisible({ timeout: 10_000 });
  await expect(today.getByRole("link", { name: /오늘의 다짐/ })).toBeVisible();
  await expect(today.getByRole("link", { name: /오늘 식단 기록이 없어요/ })).toBeVisible();
  await expect(page.getByText(/일 운동 · (최근 1년|가입일부터)/)).toBeVisible();

  const order = await page.evaluate(() => {
    const main = document.querySelector("main");
    const all = Array.from(main?.querySelectorAll("*") ?? []);
    const at = (el: Element | null) => (el ? all.indexOf(el) : -1);
    return {
      today: at(document.querySelector('[data-testid="home-today"]')),
      grass: at(
        Array.from(main?.querySelectorAll("p") ?? []).find((p) =>
          /일 운동 ·/.test(p.textContent ?? ""),
        ) ?? null,
      ),
      promo: at(document.querySelector('section[aria-label="함께하는 서비스"]')),
    };
  });
  expect(order.promo).toBeGreaterThanOrEqual(0);
  expect(order.today).toBeGreaterThan(order.promo);
  expect(order.grass).toBeGreaterThan(order.today);

  // 알림·걸음수 배너가 두 장 겹쳐 뜨지 않는다.
  expect(await page.getByTestId("permission-nudge").count()).toBeLessThanOrEqual(1);
});

test("홈: 위치 권한을 묻지 않고 날씨 API 도 부르지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await page.addInitScript(() => {
    const w = window as unknown as { __geoCalls: number };
    w.__geoCalls = 0;
    if (navigator.geolocation) {
      const geo = navigator.geolocation;
      const count = () => {
        w.__geoCalls++;
      };
      geo.getCurrentPosition = count as typeof geo.getCurrentPosition;
      geo.watchPosition = (() => {
        count();
        return 0;
      }) as typeof geo.watchPosition;
    }
  });
  const weatherCalls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("open-meteo")) weatherCalls.push(r.url());
  });

  await createOnboardedAccount(page);
  await page.goto("/home", { waitUntil: "networkidle" });
  await expect(page.getByTestId("home-today")).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1500);

  expect(await page.evaluate(() => (window as unknown as { __geoCalls: number }).__geoCalls)).toBe(0);
  expect(weatherCalls).toEqual([]);
});

test("하단 탭 라벨은 좁은 폰(360px)에서도 11px 이상", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await page.setViewportSize({ width: 360, height: 740 });
  await createOnboardedAccount(page);
  await page.goto("/home", { waitUntil: "networkidle" });

  const label = page
    .getByRole("navigation", { name: "주요 메뉴" })
    .getByText("커뮤니티", { exact: true });
  await expect(label).toBeVisible();
  const px = await label.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(px).toBeGreaterThanOrEqual(11);
});
