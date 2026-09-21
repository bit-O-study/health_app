import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { hasDb } from "./helpers/db";

// 2026-09-20 런처 전환 — 홈은 카드를 세로로 쌓지 않는다.
// 광고 배너(맨 위, 원상복구) → 앱 아이콘 판 → 앱별 요약 위젯 3개.
// 예전에 홈에 있던 다짐·식단·목표·이번주·잔디는 각 앱 안으로 옮겨 갔다.

test("홈: 광고 배너 → 앱 격자 → 요약 위젯 순서이고, 권한 줄은 하나뿐이다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await createOnboardedAccount(page);
  await page.goto("/home", { waitUntil: "networkidle" });

  const grid = page.getByRole("navigation", { name: "앱" });
  await expect(grid).toBeVisible({ timeout: 10_000 });
  // 헬쑤쌤은 디버그 기능이 켜진 사용자에게만 — 보통 계정은 6개.
  await expect(grid.getByRole("link")).toHaveCount(6);
  for (const app of ["운동", "식단", "캘린더", "그룹", "커뮤니티", "펫"]) {
    await expect(grid.getByRole("link", { name: app, exact: true })).toBeVisible();
  }

  const widgets = page.getByRole("region", { name: "오늘 요약" });
  await expect(widgets.getByRole("link")).toHaveCount(3);

  const order = await page.evaluate(() => {
    const main = document.querySelector("main");
    const all = Array.from(main?.querySelectorAll("*") ?? []);
    const at = (el: Element | null) => (el ? all.indexOf(el) : -1);
    return {
      promo: at(document.querySelector('section[aria-label="함께하는 서비스"]')),
      grid: at(document.querySelector('nav[aria-label="앱"]')),
      widgets: at(document.querySelector('section[aria-label="오늘 요약"]')),
    };
  });
  expect(order.promo).toBeGreaterThanOrEqual(0);
  expect(order.grid).toBeGreaterThan(order.promo);
  expect(order.widgets).toBeGreaterThan(order.grid);

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
  await expect(page.getByRole("navigation", { name: "앱" })).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1500);

  expect(await page.evaluate(() => (window as unknown as { __geoCalls: number }).__geoCalls)).toBe(0);
  expect(weatherCalls).toEqual([]);
});

test("하단 탭 라벨은 좁은 폰(360px)에서도 11px 이상", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await page.setViewportSize({ width: 360, height: 740 });
  await createOnboardedAccount(page);
  // 가장 긴 라벨이 있는 운동 앱에서 잰다(오늘·루틴·홈·운동찾기·기록).
  await page.goto("/routine", { waitUntil: "networkidle" });

  const label = page
    .getByRole("navigation", { name: "주요 메뉴" })
    .getByText("운동찾기", { exact: true });
  await expect(label).toBeVisible();
  const px = await label.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(px).toBeGreaterThanOrEqual(11);
});
