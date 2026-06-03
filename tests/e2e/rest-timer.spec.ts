import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";

// 지능형 휴식 타이머: 운동 시작 화면(가이드 오버레이)에서 휴식 시간을 설정하고,
// 세트 완료 버튼을 누르면 자동 카운트다운(휴식 타이머)이 시작되어야 한다.

test("가이드 화면에서 휴식 시간 설정 + 세트 완료 시 휴식 타이머가 시작된다", async ({
  page,
}) => {
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);
  const overlay = page.locator("div.z-40").last();

  // 휴식 프리셋 선택 UI 노출 — 2:00 선택
  await expect(overlay.getByRole("button", { name: "2:00" })).toBeVisible();
  await overlay.getByRole("button", { name: "2:00" }).click();

  // 세트 완료 버튼(세트가 여러 개인 본운동)이 나올 때까지 진행
  let found = false;
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole("button", { name: /세트 완료 · 휴식/ }).count()) {
      found = true;
      break;
    }
    const next = page.getByRole("button", { name: "넘기기" });
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(420);
  }
  expect(found, "세트 완료 버튼이 있는 본운동을 찾지 못함").toBe(true);

  // 현재 세트 1/N
  await expect(page.getByText(/세트 1\//)).toBeVisible();

  // 세트 완료 → 휴식 타이머 카드 등장 + 세트 진행 2/N 로 증가
  await page.getByRole("button", { name: /세트 완료 · 휴식/ }).click();
  await expect(page.getByText("휴식 중")).toBeVisible();
  await expect(page.getByText(/세트 2\//)).toBeVisible();
});

test("성장 그래프 페이지가 열린다", async ({ page }) => {
  await signUpAndOnboard(page);
  await page.goto("/settings/progress", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "성장 그래프" }),
  ).toBeVisible();
});
