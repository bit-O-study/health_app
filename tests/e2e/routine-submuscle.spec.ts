import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";

// 루틴 빌더의 "부위 추가"는 2단 드릴다운: 부위(가슴/등/…) → 전체 또는 세부근육
// (가슴 상부/하부, 이두/삼두 등). 세부근육과 전체를 한꺼번에 늘어놓지 않는다.

test("루틴 빌더: 부위 추가 → 가슴 → '가슴 상부' 세부근육을 보조로 추가", async ({
  page,
}) => {
  await signUpAndOnboard(page);
  await page.goto("/settings/routine", { waitUntil: "networkidle" });

  // 커스텀 빌더 진입
  await page.getByRole("button", { name: "커스텀" }).click();

  // 첫 날의 "부위 추가" 메뉴 열기
  await page.getByRole("button", { name: "부위 추가" }).first().click();

  // 1단계: 부위 목록에 '가슴'. 2단계로 드릴다운.
  await page.getByRole("button", { name: "가슴", exact: true }).first().click();

  // 2단계: '가슴 전체' 와 세부근육이 보인다.
  await expect(
    page.getByRole("button", { name: "가슴 전체" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "가슴 상부", exact: true }).click();

  // 보조 칩으로 추가됨
  await expect(page.getByText("+ 가슴 상부").first()).toBeVisible();
});

test("루틴 빌더: 부위 추가 → 팔 → '이두'가 보이고 추가된다", async ({ page }) => {
  await signUpAndOnboard(page);
  await page.goto("/settings/routine", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "커스텀" }).click();

  await page.getByRole("button", { name: "부위 추가" }).first().click();
  // 1단계: '팔'
  await page.getByRole("button", { name: "팔", exact: true }).first().click();
  // 2단계: '이두'/'삼두'/'전완' 노출
  await expect(page.getByRole("button", { name: "이두", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "삼두", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "전완", exact: true })).toBeVisible();
  // 이두 추가
  await page.getByRole("button", { name: "이두", exact: true }).click();
  await expect(page.getByText("+ 이두").first()).toBeVisible();
});