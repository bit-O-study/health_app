import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";

/**
 * 뒤로가기 = 모달만 닫기(2026-09-14).
 * 안드로이드 하드웨어 back 은 WebView goBack → history.back 과 같다.
 */
test("모달이 떠 있을 때 뒤로가기는 모달만 닫고, 화면은 그대로다", async ({
  page,
}) => {
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  await page.goto("/home", { waitUntil: "networkidle" });
  await page.goto("/community", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "루틴", exact: true }).click();

  const compose = page.getByRole("dialog", { name: "내 루틴 추천글 쓰기" });
  const back = () => page.evaluate(() => window.history.back());

  // ── 1) 뒤로가기 → 모달만 닫힘, 새로고침도 없음 ─────────────────────
  await page.evaluate(() => {
    (window as unknown as { __noReload: boolean }).__noReload = true;
  });
  await page.getByRole("button", { name: "루틴 추천글 쓰기" }).click();
  await expect(compose).toBeVisible();

  await back();
  await expect(compose).toBeHidden();
  await expect(page).toHaveURL(/\/community/);
  expect(
    await page.evaluate(
      () => (window as unknown as { __noReload?: boolean }).__noReload,
    ),
  ).toBe(true);

  // ── 2) 겹친 모달 → 뒤로가기 한 번에 위에 것 하나만 ─────────────────
  await page.getByRole("button", { name: "루틴 추천글 쓰기" }).click();
  await expect(compose).toBeVisible();
  await page.getByRole("button", { name: /^1일차 · .+ 추천글 쓰기$/ }).click();
  await expect(page.getByText("이 일차를 소개하기")).toBeVisible();

  await back();
  await expect(page.getByText("이 일차를 소개하기")).toBeHidden();
  await expect(compose).toBeVisible();

  // ── 3) X 로 닫은 뒤 뒤로가기는 헛돌지 않고 바로 이전 화면으로 ─────
  await compose.getByRole("button", { name: "닫기" }).click();
  await expect(compose).toBeHidden();

  await back();
  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
});
