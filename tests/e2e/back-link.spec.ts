import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { hasDb } from "./helpers/db";

// 백링크는 고정 경로("/routine" 등)가 아니라 "요청해 들어온 이전 화면"으로
// 돌아가야 한다. 예전엔 설정에서 뒤로 누르면 홈에서 들어왔어도 늘 /routine 으로
// 튕겼다 — BackLink(router.back()) 로 바꾼 뒤의 회귀 방지 테스트.
test("설정 백링크는 들어온 경로로 되돌아간다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  // 홈 → 설정 → 마이페이지 로 들어간 뒤 뒤로 두 번.
  await page.goto("/home", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "설정" }).first().click();
  await page.waitForURL("**/settings");

  await page.getByRole("link", { name: /마이페이지/ }).first().click();
  await page.waitForURL("**/settings/me");

  // 마이페이지의 백링크 → 설정
  await page.getByRole("button", { name: "설정" }).first().click();
  await page.waitForURL("**/settings");

  // 설정의 백링크 → (고정 /routine 이 아니라) 들어온 곳인 홈
  await page.getByRole("button", { name: "뒤로" }).first().click();
  await page.waitForURL("**/home");
  expect(new URL(page.url()).pathname).toBe("/home");
});
