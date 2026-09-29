import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, createOnboardedAccount } from "./helpers/auth";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 운동 모드(몰입형) 공통 규칙 — 2026-09-28 운동 모드 재설계 검수보고서 "어느 안이든 같이 할 것".
 *  ① 지금 세트가 이름 아래 크게(20px 이상) 하나만
 *  ② 쉬는 동안엔 세트 완료·휴식 프리셋이 없고 '휴식 끝내기'만 — 끝내면 세트 완료로 돌아온다
 *  ③ 진행 칸 수 = 옆 숫자의 분모(남은 운동 기준)
 *  ④ 숫자는 탭하면 직접 입력
 */
test("운동 모드 공통 규칙: 지금 세트·휴식 상태·진행 표시·탭 입력", async ({ page }) => {
  test.setTimeout(180_000);
  await silenceDevOverlay(page);
  await createOnboardedAccount(page);
  await seedRecommendedExercises(page);

  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);

  // 세트가 여러 개인 본운동까지.
  const currentSet = page.getByTestId("current-set");
  for (let i = 0; i < 40 && !(await currentSet.count()); i++) {
    const next = page.getByRole("button", { name: "넘기기" });
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(420);
  }

  // ① 지금 세트
  await expect(currentSet).toHaveText(/^세트 1\/\d+$/);
  expect(await currentSet.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(20);
  await expect(page.getByText(/^세트 1\/\d+$/)).toHaveCount(1);

  // ③ 진행 칸 수 = n / m 의 m
  const counter = await page.getByTestId("guided-progress").innerText();
  const m = Number(counter.split("/")[1].trim());
  const segments = page.getByTestId("guided-progress").locator("xpath=preceding-sibling::div[1]/span");
  if (m <= 24) await expect(segments).toHaveCount(m);

  // ④ 탭하면 직접 입력
  await page.getByRole("slider", { name: "횟수" }).click();
  await expect(page.getByRole("spinbutton", { name: "횟수 직접 입력" })).toBeVisible();
  await page.keyboard.press("Escape");

  // ② 세트 완료 → 쉬는 동안엔 세트 완료·프리셋 없음, '휴식 끝내기'만
  await expect(page.getByRole("button", { name: "1:30" })).toBeVisible();
  await page.getByRole("button", { name: "세트 완료", exact: true }).click();
  await expect(page.getByText("휴식 중")).toBeVisible();
  await expect(currentSet).toHaveText(/^세트 2\/\d+$/);
  await expect(page.getByRole("button", { name: "세트 완료", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "1:30" })).toHaveCount(0);
  await page.getByRole("button", { name: "휴식 끝내기" }).click();
  await expect(page.getByRole("button", { name: "세트 완료", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "1:30" })).toBeVisible();

  // 닫기 확인은 '운동 끝내기' — '중단' 문구 없음
  await page.getByRole("button", { name: "닫기" }).first().click();
  await expect(page.getByRole("button", { name: "끝내기", exact: true })).toBeVisible();
  await expect(page.getByText("중단")).toHaveCount(0);
});
