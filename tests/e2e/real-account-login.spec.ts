import { expect, test } from "@playwright/test";

import { hasDb, realAccount } from "./helpers/db";

// 실계정 로그인 스모크 — 실제 계정으로 로그인하면 '오늘의 운동'이 에러 없이 렌더된다.
// 자격증명은 .env.test.local 의 E2E_REAL_EMAIL/E2E_REAL_PW (gitignore) — 소스에 비번 없음.
// 없으면 스킵(CI/타인 환경 안전). 비파괴: 데이터를 바꾸지 않는다
// (삭제-독립 회귀는 main-edit-delete-independence.spec.ts 가 결정적으로 커버).

test("실계정 로그인 → 오늘의 운동이 정상 렌더된다", async ({ page }) => {
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
});
