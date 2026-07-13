import { expect, test, type Page } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { hasDb } from "./helpers/db";

// 오늘만 운동 편집기 = '부위 먼저 고르기'(기존 운동 추가 방식): 행마다 부위 드롭다운 →
// 그 부위 운동만 목록. 부위 안에서 세부근육 칩으로 더 좁힐 수 있다.

async function dismissNudge(page: Page) {
  const later = page.getByRole("button", { name: "나중에" });
  if (await later.count()) await later.first().click().catch(() => {});
}

async function openAdjust(page: Page) {
  await dismissNudge(page);
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();
  await expect(
    page.getByRole("heading", { name: "오늘만 운동 바꾸기" }),
  ).toBeVisible({ timeout: 8000 });
}

test("직접 담기: 부위 드롭다운 → 그 부위 운동 + 세부근육 칩으로 좁히기", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  await openAdjust(page);
  await page.getByRole("button", { name: "운동 직접 담기" }).click();
  await expect(page).toHaveURL(/\/plan\/today/, { timeout: 30000 });
  await page.waitForTimeout(1000);

  // 운동 한 줄 추가 → 행에 부위 드롭다운(전체 부위)이 있어야 한다.
  await page.getByRole("button", { name: "운동 추가" }).first().click();
  const partSelect = page.getByLabel("부위").first();
  await expect(partSelect).toBeVisible();

  // 부위를 '가슴'으로 → 운동 콤보 열면 가슴 운동 + 세부근육 칩.
  await partSelect.selectOption("chest");
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "운동", exact: true }).first().click();
  await expect(page.getByRole("group", { name: "세부 근육 선택" })).toBeVisible({
    timeout: 8000,
  });

  const listbox = page.getByRole("listbox");
  const before = await listbox.getByRole("option").count();
  expect(before).toBeGreaterThan(0);
  // 세부근육 하나 선택 → 목록이 좁아진다.
  const subGroup = page.getByRole("group", { name: "세부 근육 선택" });
  await subGroup.getByRole("button").nth(1).click(); // 0='세부 전체'
  await page.waitForTimeout(300);
  const after = await listbox.getByRole("option").count();
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThanOrEqual(before);
});

test("부위 추가: 편집기에 현재 오늘 운동 + 추가한 부위가 함께 나온다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  await openAdjust(page);
  // 어깨를 부위 추가
  await page.getByRole("button", { name: "어깨", exact: true }).click();
  await page.getByRole("button", { name: "오늘만 부위 추가" }).click();
  await expect(page).toHaveURL(/\/plan\/today.*add=1/, { timeout: 30000 });
  await page.waitForTimeout(1200);

  // 부위 드롭다운(행)에 현재 오늘 부위 + 어깨가 선택지로 있어야 한다.
  const partSelects = page.getByLabel("부위");
  // 현재 운동이 있으므로 행이 1개 이상, 부위 드롭다운에 어깨 옵션 존재.
  await page.getByRole("button", { name: "운동 추가" }).first().click();
  const opts = await partSelects
    .first()
    .locator("option")
    .allTextContents();
  expect(opts.join(",")).toContain("어깨");
});
