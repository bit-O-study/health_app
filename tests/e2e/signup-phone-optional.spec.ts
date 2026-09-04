import { expect, test } from "@playwright/test";

import { freshEmail, TEST_PASSWORD } from "./helpers/auth";

/**
 * 회원가입에서 전화번호는 **선택**이고, 핸드폰 OTP 단계는 **없다**.
 *
 * Supabase Auth 의 Phone 공급자가 꺼져 있어 `updateUser({phone})` 이
 * 500 "Unable to get SMS provider" 를 돌려줬고, 가입폼은 그 실패를 잡아 인증을
 * 건너뛰고 있었다 — 즉 운영에서도 번호는 아무도 검증하지 않는데 필수로 받고
 * 화면만 한 장 더 태우고 있었다. 그래서 필수 표시와 OTP 단계를 걷어냈다.
 * 이 스펙이 깨지면 그 화면이 되살아난 것이다.
 */

async function openSignupForm(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "회원가입" }).click();
  await page.waitForSelector("#name", { timeout: 15_000 });
}

test("전화번호 칸은 '(선택)' 으로 표시된다", async ({ page }) => {
  await openSignupForm(page);

  const label = page.locator('label[for="phone"]');
  await expect(label).toContainText("전화번호");
  await expect(label).toContainText("(선택)");
});

test("★ 전화번호 없이도 가입되고 곧장 온보딩으로 간다(OTP 화면 없음)", async ({
  page,
}) => {
  await openSignupForm(page);

  await page.fill("#name", "검증유저");
  // 전화번호는 일부러 비운다.
  await page.fill("#email", freshEmail());
  await page.fill("#password", TEST_PASSWORD);
  await page.getByRole("button", { name: "회원가입" }).last().click();

  await page.waitForURL("**/onboarding", { timeout: 30_000 });
  // 중간에 인증번호 화면이 끼어들지 않았다.
  await expect(page.getByText("핸드폰 인증")).toHaveCount(0);
  await expect(page.locator("#otp")).toHaveCount(0);
});

test("전화번호를 넣고 가입해도 OTP 없이 온보딩으로 간다", async ({ page }) => {
  await openSignupForm(page);

  await page.fill("#name", "검증유저");
  await page.fill("#phone", "010-1234-5678");
  await page.fill("#email", freshEmail());
  await page.fill("#password", TEST_PASSWORD);
  await page.getByRole("button", { name: "회원가입" }).last().click();

  await page.waitForURL("**/onboarding", { timeout: 30_000 });
  await expect(page.locator("#otp")).toHaveCount(0);
});

test("이름은 여전히 필수 · 전화번호는 아니다", async ({ page }) => {
  await openSignupForm(page);

  // 이름은 브라우저 기본 검증(required)에서 먼저 걸린다 — 폼 JS 까지 가지도 않는다.
  await expect(page.locator("#name")).toHaveAttribute("required", "");
  await expect(page.locator("#phone")).not.toHaveAttribute("required", /.*/);

  await page.fill("#email", freshEmail());
  await page.fill("#password", TEST_PASSWORD);
  await page.getByRole("button", { name: "회원가입" }).last().click();

  // 이름이 비어 제출이 막히므로 로그인 페이지에 그대로 머문다.
  await page.waitForTimeout(1_000);
  expect(new URL(page.url()).pathname).toBe("/login");
});
