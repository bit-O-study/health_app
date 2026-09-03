import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";

async function openRunningMenu(page: import("@playwright/test").Page) {
  await page.goto("/routine", { waitUntil: "networkidle" });
  const later = page.getByRole("button", { name: "나중에" });
  if (await later.count()) await later.first().click().catch(() => {});
  await page.locator("[data-today-focus-badge]").first().click();
  await expect(page.getByRole("button", { name: /실내 런닝/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /야외 런닝/ })).toBeVisible();
}

test("운동 화면에서 실내·야외 런닝을 나눠 선택한 모드로 바로 진입한다", async ({
  page,
}) => {
  await signUpAndOnboard(page);

  await openRunningMenu(page);
  await page.getByRole("button", { name: /야외 런닝/ }).click();
  await expect(
    page.getByRole("heading", { name: "오늘 야외 런닝으로 대체할까요?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "아니요 — 기존 운동은 그대로 두고 런닝" })
    .click();
  await expect(page).toHaveURL(/\/running\?mode=outdoor$/);
  await expect(page.getByRole("heading", { name: "야외 런닝 📍" })).toBeVisible();

  await openRunningMenu(page);
  await page.getByRole("button", { name: /실내 런닝/ }).click();
  await expect(
    page.getByRole("heading", { name: "오늘 실내 런닝으로 대체할까요?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "예 — 오늘 운동을 런닝으로 대체 (운동은 내일로)" })
    .click();
  await expect(page).toHaveURL(/\/running\?mode=indoor$/);
  await expect(page.getByRole("heading", { name: "실내 런닝 🏠" })).toBeVisible();
});
