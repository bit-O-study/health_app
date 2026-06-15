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

  // 카드 클릭 → 실제로 /running 으로 들어가야 한다(관리자도 막히지 않음).
  // (mobile-chromium 컨텍스트라 모바일 게이트 통과 → 게임 인트로가 떠야 한다.)
  await card.click();
  await expect(page).toHaveURL(/\/running$/);
  await expect(page.getByRole("heading", { name: "런닝 모드 🏃" })).toBeVisible({
    timeout: 8000,
  });
});

test("관리자 세션에서도 런닝모드 3D 모델(.glb)이 /admin 으로 리다이렉트되지 않는다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await dbQuery(
    `insert into public.admins(email) values($1) on conflict (email) do nothing`,
    [email.toLowerCase()],
  );
  // 관리자 세션을 확립(미들웨어가 admins 를 인식하도록 한 번 방문).
  await page.goto("/admin", { waitUntil: "networkidle" });

  // 정적 모델 에셋은 미들웨어를 타지 않고 그대로 200 이어야 한다(307→/admin 금지).
  const res = await page.request.get("/models/runner.glb", { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  const buf = await res.body();
  expect(buf.length).toBeGreaterThan(1_000_000); // 2.1MB GLB
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
