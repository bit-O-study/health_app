import { expect, test, type Locator, type Page } from "@playwright/test";
import { createOnboardedAccount } from "./helpers/auth";
import { hasDb } from "./helpers/db";

async function dragApp(page: Page, source: Locator, target: Locator, touch = false) {
  await source.scrollIntoViewIfNeeded();
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("Drag targets must be visible");
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  if (touch) {
    const client = await page.context().newCDPSession(page);
    try {
      await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 1 }] });
      for (let step = 1; step <= 8; step++) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x + (end.x - start.x) * step / 8, y: start.y + (end.y - start.y) * step / 8, id: 1 }] });
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } finally { await client.detach(); }
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  }
}

test("홈 앱 추가 팝업·하단 드래그·새로고침 유지", async ({ page }) => {
  test.skip(!hasDb, "needs DB fixtures");

  await createOnboardedAccount(page);
  await page.goto("/home");
  await expect(page.getByRole("link", { name: "헬쑤 홈", exact: true })).toBeVisible();
  await expect(page.locator("main > header").getByRole("link", { name: "설정", exact: true })).toHaveAttribute("href", "/settings");
  await expect(page.getByRole("link").filter({ hasText: "오늘의 다짐" })).toBeVisible();
  const grid = page.getByRole("navigation", { name: "앱", exact: true });
  const picker = page.getByRole("dialog", { name: "앱 추가", exact: true });
  const plus = grid.getByRole("button", { name: "앱 추가", exact: true });
  await expect(plus).toHaveCount(0);
  await grid.getByRole("button", { name: "편집", exact: true }).click();
  await expect(picker).toHaveCount(0);
  await grid.getByRole("button", { name: "식단 숨기기", exact: true }).click();
  await grid.getByRole("button", { name: "완료", exact: true }).click();
  await page.reload();
  await expect(grid.getByRole("link", { name: "식단", exact: true })).toHaveCount(0);
  await grid.getByRole("button", { name: "편집", exact: true }).click();
  await expect(plus).toHaveText("");
  await plus.click();
  await expect(picker).toBeVisible();
  await page.screenshot({ path: "scripts/.verify-shots/home-app-picker.png", fullPage: true });
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await expect(plus).toBeFocused();
  await plus.click();
  await page.goBack();
  await expect(picker).toHaveCount(0);
  await expect(page).toHaveURL(/\/home$/);
  await plus.click();
  await picker.getByRole("button", { name: "식단 추가", exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(grid.getByRole("button", { name: "식단 숨기기", exact: true })).toBeVisible();
  await plus.click();
  await expect(picker.getByText("추가할 수 있는 앱이 모두 홈에 있어요.")).toBeVisible();
  await picker.getByRole("button", { name: "앱 추가 닫기", exact: true }).click();
  let hiddenCount = 0;
  while (await grid.getByRole("button", { name: / 숨기기$/ }).count()) {
    await grid.getByRole("button", { name: / 숨기기$/ }).first().click();
    hiddenCount++;
  }
  await grid.getByRole("button", { name: "완료", exact: true }).click();
  await expect(grid.getByText("편집을 눌러 홈에 앱을 추가해 보세요.")).toBeVisible();
  await grid.getByRole("button", { name: "편집", exact: true }).click();
  for (let count = 0; count < hiddenCount; count++) {
    await plus.click();
    await picker.getByRole("list").getByRole("button").first().click();
    await expect(picker).toHaveCount(0);
  }
  const editor = grid.getByRole("region", { name: "하단 바로가기 편집", exact: true });
  const slot = (index: number) => editor.getByRole("button", { name: new RegExp(`^하단 ${index}번 자리:`) });
  const bottom = page.getByRole("navigation", { name: "주요 메뉴" });
  await expect(editor.getByRole("combobox")).toHaveCount(0);
  await editor.scrollIntoViewIfNeeded();
  await dragApp(page, editor.getByRole("button", { name: "커뮤니티 배치", exact: true }), slot(1));
  await expect(slot(1)).toHaveAccessibleName("하단 1번 자리: 커뮤니티");
  await expect(bottom.getByRole("link").nth(0)).toHaveText("커뮤니티");
  await dragApp(page, slot(1), slot(4), true);
  await expect(slot(1)).toHaveAccessibleName("하단 1번 자리: 그룹");
  await expect(slot(4)).toHaveAccessibleName("하단 4번 자리: 커뮤니티");
  // Dropping on the fixed home never changes the slots.
  await dragApp(page, slot(1), editor.getByLabel("가운데 홈 고정"));
  await expect(slot(1)).toHaveAccessibleName("하단 1번 자리: 그룹");
  // Keyboard users can select an app then activate a destination.
  await editor.getByRole("button", { name: "운동 배치", exact: true }).focus();
  await page.keyboard.press("Enter");
  await slot(1).focus();
  await page.keyboard.press("Enter");
  await expect(slot(1)).toHaveAccessibleName("하단 1번 자리: 운동");
  await editor.getByRole("button", { name: "운동 바로가기 제거", exact: true }).click();
  await expect(slot(1)).toHaveAccessibleName("하단 1번 자리: 빈칸");
  await grid.getByRole("button", { name: "완료", exact: true }).click();
  await page.reload();
  await expect(grid.getByRole("link", { name: "식단", exact: true })).toBeVisible();
  await expect(bottom.getByRole("link").nth(4)).toHaveText("커뮤니티");
  await bottom.getByRole("link", { name: "앱 추가", exact: true }).click();
  await expect(editor).toBeVisible();
  await expect(slot(1)).toHaveAccessibleName("하단 1번 자리: 빈칸");
  await dragApp(page, editor.getByRole("button", { name: "운동 배치", exact: true }), slot(1), true);
  await expect(slot(1)).toHaveAccessibleName("하단 1번 자리: 운동");
  await page.screenshot({ path: "scripts/.verify-shots/home-dock-drag.png", fullPage: true });
  await grid.getByRole("button", { name: "완료", exact: true }).click();
  const grass = page.getByRole("region", { name: "운동 잔디", exact: true });
  await grass.scrollIntoViewIfNeeded();
  const day = grass.getByRole("button").last();
  const label = await day.getAttribute("aria-label");
  await day.click();
  await expect(grass.getByRole("status")).toHaveText(`${label} 운동`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});