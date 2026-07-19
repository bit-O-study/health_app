import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { hasDb } from "./helpers/db";

// #12: 운동탭 왼쪽에 '홈' 탭 신설 — 홈에 체형목표·내다짐·설정. 운동탭에선 설정 제거.

test("홈 탭: 체형목표·내다짐·설정이 홈에 있고, 운동탭엔 설정이 없다(#12)", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  // 홈으로 이동 — 하단탭 '홈' 이 존재해야 한다.
  await page.goto("/home", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await expect(
    page.getByRole("link", { name: "홈" }).first(),
  ).toBeVisible();

  // 홈에 내다짐·설정 진입점이 있어야 한다.
  await expect(page.getByRole("link", { name: /내다짐/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /설정/ })).toBeVisible();

  // 운동탭(/routine) 으로 이동 — 실제 운동탭에 도달했는지 확인.
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await expect(
    page.getByRole("heading", { name: "오늘의 운동" }),
  ).toBeVisible({ timeout: 10000 });
  // 헤더에 설정 아이콘(aria-label 정확히 '설정')이 없어야 한다(홈으로 옮김).
  await expect(
    page.getByRole("link", { name: "설정", exact: true }),
  ).toHaveCount(0);

  // 하단탭에 홈·운동이 모두 있어야 한다.
  await expect(page.getByRole("link", { name: "홈" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "운동" }).first()).toBeVisible();
});
