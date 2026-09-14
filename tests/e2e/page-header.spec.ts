import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { hasDb } from "./helpers/db";

// 2026-09-14 화면 간결화 4·5단계 — 탭 화면은 같은 머리글(PageHeader)·같은 폭.
// 탭을 넘길 때 제목 위치가 흔들리지 않아야 한다.

test("식단·캘린더·설정은 같은 머리글과 같은 폭을 쓴다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await createOnboardedAccount(page);

  const boxes: { path: string; x: number; width: number }[] = [];
  for (const [path, title] of [
    ["/diet", "식단"],
    ["/calendar", "캘린더"],
    ["/settings", "설정"],
  ] as const) {
    await page.goto(path, { waitUntil: "networkidle" });
    const heading = page.getByRole("heading", { name: title, level: 1 });
    await expect(heading).toBeVisible({ timeout: 10_000 });
    const inner = page.getByTestId("page-header").locator(":scope > div");
    const box = await inner.boundingBox();
    boxes.push({ path, x: Math.round(box?.x ?? -1), width: Math.round(box?.width ?? -1) });
  }
  for (const b of boxes) {
    expect(b, JSON.stringify(boxes)).toEqual({ ...boxes[0], path: b.path });
  }
});

test("설정 행은 한 모양 — 누르면 해당 화면으로 가고, 뒤로는 들어온 곳으로", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await createOnboardedAccount(page);
  await page.goto("/home", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "설정" }).first().click();
  await page.waitForURL("**/settings");

  const rows = page.getByTestId("settings-rows").getByRole("link");
  expect(await rows.count()).toBeGreaterThanOrEqual(11);
  await expect(rows.filter({ hasText: "알림 설정" })).toBeVisible();

  await page.getByRole("button", { name: "뒤로" }).click();
  await page.waitForURL("**/home");
});
