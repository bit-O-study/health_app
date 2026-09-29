import { expect, test } from "@playwright/test";
import { createOnboardedAccount, TEST_PASSWORD } from "./helpers/auth";
import { hasDb } from "./helpers/db";

// Keep the deliberately delayed authentication request under Playwright's control.
test.use({ serviceWorkers: "block" });

test("로그인 대기 중에는 로고만 보이고 실패하면 입력 화면으로 돌아온다", async ({ page }) => {
  let finish!: () => void;
  const waiting = new Promise<void>(resolve => { finish = resolve; });
  await page.route("**/auth/v1/token?grant_type=password", async route => {
    await waiting;
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials" }) });
  });
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.fill("#email", "progress-check@example.com");
  await page.fill("#password", "wrong-password");
  await page.getByRole("button", { name: "로그인", exact: true }).last().click();
  try {
    const screen = page.getByTestId("login-progress");
    await expect(screen).toBeVisible();
    await expect(screen).toHaveText("");
    await expect(screen.locator("svg")).toBeVisible();
    await expect(screen.getByRole("progressbar")).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(screen).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("login-progress-mobile.png") });
  } finally { finish(); }
  await expect(page.getByTestId("login-progress")).toHaveCount(0);
  await expect(page.locator("#password")).toBeEnabled();
  await expect(page.getByText("이메일 또는 비밀번호가 올바르지 않습니다.")).toBeVisible();
});

test("로그인 성공 후 짐꾼 화면이 사라지고 홈과 탭으로 진입한다", async ({ page }) => {
  test.skip(!hasDb, "needs test DB");
  const email = await createOnboardedAccount(page);
  await page.context().clearCookies();
  await page.goto("/login?redirect=/home", { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", TEST_PASSWORD);
  await page.getByRole("button", { name: "로그인", exact: true }).last().click({ noWaitAfter: true });
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("link", { name: "짐꾼 홈", exact: true })).toBeVisible();
  await expect(page.getByTestId("login-progress")).toHaveCount(0);
  await expect(page.locator("nav").last()).toBeVisible();
});
