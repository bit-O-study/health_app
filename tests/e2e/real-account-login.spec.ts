import { expect, test } from "@playwright/test";

import { hasDb, realAccount } from "./helpers/db";

// 실계정 로그인 스모크 — 실제 계정으로 로그인하면 '오늘의 운동'이 에러 없이 렌더된다.
// 자격증명은 .env.test.local 의 E2E_REAL_EMAIL/E2E_REAL_PW (gitignore) — 소스에 비번 없음.
// 없으면 스킵(CI/타인 환경 안전). 비파괴: 데이터를 바꾸지 않는다
// (삭제-독립 회귀는 main-edit-delete-independence.spec.ts 가 결정적으로 커버).

test("실계정 로그인 → 오늘의 운동과 운동 편집이 정상 렌더된다", async ({ page }) => {
  test.skip(
    !hasDb || !realAccount,
    "needs E2E_REAL_EMAIL/E2E_REAL_PW in .env.test.local",
  );
  const { email, pw } = realAccount!;

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", pw);
  await page.locator('button[type="submit"]').click();

  // 로그인 성공 → /login 밖으로 리다이렉트될 때까지 대기.
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 20_000,
  });

  await page.goto("/routine", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "오늘의 운동" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
  // 메뉴 해제의 history.back()이 느린 편집 화면 이동을 취소하지 않아야 한다.
  await page.route("**/plan?*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
  await page.locator("[data-today-focus-badge]").click();
  await page.getByRole("button", { name: "운동 편집" }).click();
  await expect(page).toHaveURL(/\/plan$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "운동 등록", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "운동 등록", exact: true })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/routine$/);
  await expect(page.getByRole("heading", { name: "오늘의 운동" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "오늘 운동 관리" })).toHaveCount(0);
  await page.locator("[data-today-focus-badge]").click();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "오늘 운동 관리" })).toHaveCount(0);
  await expect(page).toHaveURL(/\/routine$/);
});


test("입력 이벤트 없는 자동완성 값으로도 로그인된다", async ({ page }) => {
  test.skip(!hasDb || !realAccount, "needs real-account credentials");
  const { email, pw } = realAccount!;
  await page.goto("/login", { waitUntil: "networkidle" });
  // 비밀번호 매니저처럼 DOM에만 값을 넣고 React onChange는 발생시키지 않는다.
  await page.locator("#email").evaluate((input, value) => {
    (input as HTMLInputElement).value = value;
  }, email);
  await page.locator("#password").evaluate((input, value) => {
    (input as HTMLInputElement).value = value;
  }, pw);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 30_000 });
});
