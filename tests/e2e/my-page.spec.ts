import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { hasDb } from "./helpers/db";

// 마이페이지: 설정 → 마이페이지 카드 → 프로필·신체·식단·운동 요약이 보인다.
// 온보딩 기본값(이름 검증유저, 키175/몸무게75, 남자)을 그대로 검증한다.

test("설정에서 마이페이지로 들어가 프로필·신체 요약 확인", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await page.goto("/settings", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /마이페이지/ }).click();
  await page.waitForURL("**/settings/me", { timeout: 10000 });

  // 제목 + 프로필 헤더(이름/이메일)
  await expect(page.getByRole("heading", { name: "마이페이지" })).toBeVisible();
  await expect(page.getByText("검증유저").first()).toBeVisible();
  await expect(page.getByText(email).first()).toBeVisible();

  // 성별/경력 뱃지
  await expect(page.getByText("남자").first()).toBeVisible();

  // 신체 정보 — 키 175 / 몸무게 75 / BMI 분류(175·75 → 24.5 → 과체중)
  await expect(page.getByText("175", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("75", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("과체중").first()).toBeVisible();

  // 섹션들이 렌더된다
  await expect(page.getByRole("heading", { name: "오늘 식단" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "운동 요약" })).toBeVisible();
});
