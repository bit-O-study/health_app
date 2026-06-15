import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 관리자 콘솔의 "테스트" 탭 — 숨은 런닝 모드 진입점.

test("관리자 테스트 탭에서 런닝 모드로 들어갈 수 있다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await dbQuery(
    `insert into public.admins(email) values($1) on conflict (email) do nothing`,
    [email.toLowerCase()],
  );

  await page.goto("/admin", { waitUntil: "networkidle" });

  // 사이드바에 "테스트" 탭이 있고, 클릭하면 런닝 모드 카드가 보인다.
  await page.getByRole("link", { name: "테스트" }).click();
  await expect(page.getByRole("heading", { name: "테스트" })).toBeVisible();
  const card = page.getByRole("link", { name: /런닝 모드/ });
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("href", "/running");
});

test("관리자가 아니면 /admin/test 의 런닝 모드 진입점이 보이지 않는다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page); // 일반 회원(관리자 아님)
  await page.goto("/admin/test", { waitUntil: "networkidle" });

  // notFound() 처리되어 런닝 모드 카드/링크가 노출되지 않아야 한다.
  await expect(page.getByRole("link", { name: /런닝 모드/ })).toHaveCount(0);
  await expect(page.locator('a[href="/running"]')).toHaveCount(0);
});
