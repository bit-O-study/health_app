import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { hasDb } from "./helpers/db";

/**
 * 회귀: "오늘만 운동 바꾸기" 시트가 폰 화면 밖으로 넘쳐 깨져 보이면 안 된다.
 * (높이 제한/내부 스크롤이 없어서 부위 칩이 길어지면 아래가 잘렸다.)
 */
test("오늘만 바꾸기 시트가 폰 화면 안에 들어오고 맨 아래 버튼까지 닿는다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await page.setViewportSize({ width: 390, height: 700 }); // 작은 폰
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  const later = page.getByRole("button", { name: "나중에" });
  if (await later.count()) await later.first().click().catch(() => {});

  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();
  const heading = page.getByRole("heading", { name: "오늘만 운동 바꾸기" });
  await expect(heading).toBeVisible({ timeout: 8000 });

  // 시트 패널 = 헤딩의 스크롤 컨테이너.
  const sheet = page.locator("div.overflow-y-auto", { has: heading });
  const box = await sheet.boundingBox();
  const vh = page.viewportSize()!.height;
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(-1); // 위로 안 잘림
  expect(box!.y + box!.height).toBeLessThanOrEqual(vh + 1); // 아래로 안 넘침

  // 내부 스크롤로 맨 아래 액션 버튼까지 실제로 닿아야 한다.
  const addBtn = page.getByRole("button", { name: "오늘만 부위 추가" });
  await addBtn.scrollIntoViewIfNeeded();
  await expect(addBtn).toBeInViewport();
});