import { expect, type Page } from "@playwright/test";

/** Unique throwaway email. Prefix `e2e_` lets global-teardown clean it up. */
export function freshEmail(): string {
  return `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
}

export const TEST_PASSWORD = "test123456";

/**
 * Sign up a brand-new account and complete onboarding, landing on the home page.
 * On localhost the signup flow skips phone OTP (see auth-form isLocalEnv).
 * Returns the email used (for assertions / cleanup).
 *
 * NOTE: onboarding always saves the routine in "manual" fill mode (the onboarding
 * handler ignores the fill toggle), so NO exercises are seeded here. Call
 * seedRecommendedExercises() afterwards when a spec needs a populated workout.
 */
export async function signUpAndOnboard(page: Page): Promise<string> {
  const email = freshEmail();

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "회원가입" }).click();
  await page.waitForSelector("#name", { timeout: 15_000 });
  await page.fill("#name", "검증유저");
  await page.fill("#phone", "010-1234-5678");
  await page.fill("#email", email);
  await page.fill("#password", TEST_PASSWORD);
  await page.getByRole("button", { name: "회원가입" }).last().click();
  await page.waitForURL("**/onboarding", { timeout: 30_000 });

  // gender → next
  await page.getByRole("button", { name: "남자" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  // experience: first option → next
  await page.locator("section button.w-full").first().click();
  await page.getByRole("button", { name: "다음" }).click();
  // body: height/weight + first body type → next
  await page.locator('input[placeholder="170"]').fill("175");
  await page.locator('input[placeholder="65"]').fill("75");
  await page.locator("section button.w-full").first().click();
  await page.getByRole("button", { name: "다음" }).click();
  // gym → skip
  await page.getByRole("button", { name: "건너뛰기" }).click();
  await page.waitForTimeout(400);
  // recommend step → save routine → home
  await page.getByRole("button", { name: "저장" }).last().click();
  await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 30_000 });

  return email;
}

/**
 * Populate the user's plan with recommended exercises for all focuses via the
 * real /plan "추천으로 등록" action, then return to home. Today then shows a
 * full workout (warmup + main + cooldown).
 */
export async function seedRecommendedExercises(page: Page): Promise<void> {
  await page.goto("/plan", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "추천으로 등록" }).click();
  await page.getByRole("button", { name: "교체하기" }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 30_000 });
  await page.waitForTimeout(1000);
  // sanity: home should now have a startable workout
  await expect(page.getByRole("button", { name: "운동 시작" })).toBeVisible();
}
