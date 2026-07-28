import { expect, test, type Page } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { hasDb } from "./helpers/db";

/**
 * 회귀: "오늘만 운동 바꾸기"에서 **세부근육**(가슴 상부 등)을 고르면, 편집기의
 * 운동 목록도 그 세부근육을 타깃하는 운동만 나와야 한다.
 * (예전엔 매핑 없는 운동이 부위 기본값 상부+중부+하부로 폴백해 사실상 전부 통과했다.)
 */
test.describe.configure({ timeout: 180_000 });

async function openAdjust(page: Page) {
  const later = page.getByRole("button", { name: "나중에" });
  if (await later.count()) await later.first().click().catch(() => {});
  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();
  await expect(
    page.getByRole("heading", { name: "오늘만 운동 바꾸기" }),
  ).toBeVisible({ timeout: 8000 });
}

test("가슴 상부만 고르면 편집기 운동 목록도 상부 운동만 나온다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  await openAdjust(page);
  await page.getByRole("button", { name: "가슴 상부", exact: true }).click();
  await page.getByRole("button", { name: "운동 전체 바꾸기" }).click();
  await expect(page).toHaveURL(/\/plan\/today/, { timeout: 30_000 });
  await page.waitForTimeout(1200);

  // 운동 한 줄 추가 → 운동 콤보 열기
  await page.getByRole("button", { name: "운동 추가" }).first().click();
  await page.getByRole("button", { name: "운동", exact: true }).first().click();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible({ timeout: 8000 });

  const names = await listbox.getByRole("option").allInnerTexts();
  expect(names.length).toBeGreaterThan(0);

  // 상부(인클라인 계열)는 있어야 하고, 중부/내측 전용(푸시업·펙덱)은 없어야 한다.
  expect(names.some((n) => n.includes("인클라인"))).toBe(true);
  expect(names.some((n) => n.trim().startsWith("푸시업"))).toBe(false);
  expect(names.some((n) => n.includes("펙 덱") || n.includes("펙덱"))).toBe(
    false,
  );
  // 가슴 전체(134개)보다 확실히 좁아야 한다.
  expect(names.length).toBeLessThan(60);
});
