import { expect, test, type Page } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { hasDb } from "./helpers/db";

// 오늘만 운동 편집기의 운동 선택기에 '부위 → 세부근육' 필터 칩이 뜨고 목록을 좁히는지 검증.
// (직접 담기 = 부위 칩 + 세부근육 칩, 부위추가 = 세부근육 칩)

async function dismissNudge(page: Page) {
  const later = page.getByRole("button", { name: "나중에" });
  if (await later.count()) await later.first().click().catch(() => {});
}

test("직접 담기 편집기: 부위·세부근육 필터 칩으로 운동을 좁힌다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  await dismissNudge(page);
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();
  await expect(
    page.getByRole("heading", { name: "오늘만 운동 바꾸기" }),
  ).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: "운동 직접 담기" }).click();
  await expect(page).toHaveURL(/\/plan\/today/, { timeout: 30000 });
  await page.waitForTimeout(1000);

  // 빈 편집기에 운동 한 줄 추가 → 콤보박스 열기
  await page.getByRole("button", { name: "운동 추가" }).first().click();
  await page.getByRole("button", { name: "운동", exact: true }).first().click();

  // 검색 시트에 부위/세부근육 필터 칩이 보여야 한다.
  await expect(page.getByRole("group", { name: "부위 선택" })).toBeVisible({
    timeout: 8000,
  });
  await expect(page.getByRole("group", { name: "세부 근육 선택" })).toBeVisible();

  // 부위 '가슴' 선택 → 세부근육 칩이 가슴 것으로 바뀌고 목록이 좁아진다.
  const listbox = page.getByRole("listbox");
  const before = await listbox.getByRole("option").count();
  await page
    .getByRole("group", { name: "부위 선택" })
    .getByRole("button", { name: "가슴", exact: true })
    .click();
  await page.waitForTimeout(300);
  const afterFocus = await listbox.getByRole("option").count();
  expect(afterFocus).toBeGreaterThan(0);
  expect(afterFocus).toBeLessThanOrEqual(before);

  // 세부근육 하나 선택 → 더 좁아진다(그 근육 운동만).
  const subGroup = page.getByRole("group", { name: "세부 근육 선택" });
  const subChip = subGroup.getByRole("button").nth(1); // 0='세부 전체'
  await subChip.click();
  await page.waitForTimeout(300);
  const afterSub = await listbox.getByRole("option").count();
  expect(afterSub).toBeGreaterThan(0);
  expect(afterSub).toBeLessThanOrEqual(afterFocus);
});