import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { hasDb } from "./helpers/db";

// 건강 연동 설정(로드맵 6.1).
//
// 웹(E2E)에서는 Health Connect 가 없다 — 그래서 여기서 지킬 수 있는 건 **약속**이다.
//  ① 항목이 무엇을 왜 가져가는지 켜기 전에 먼저 보인다
//  ② 아직 못 읽는 항목은 '준비 중'으로 정직하게 — 권한 버튼을 달지 않는다
//     (쓰지도 않을 데이터에 동의를 받으면 안 되고, 스토어 심사도 그걸 본다)
//  ③ 앱이 아니면 연결 버튼이 눌리지 않는다(눌러도 아무 일이 없는 버튼을 만들지 않는다)

test("설정에서 건강 연동으로 들어가 항목과 이유를 볼 수 있다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/settings", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /건강 연동/ }).click();
  await expect(
    page.getByRole("heading", { name: "건강 연동", level: 1 }),
  ).toBeVisible({ timeout: 10_000 });

  // 켜기 전에 무엇을 왜 가져가는지 먼저 읽을 수 있어야 한다.
  const steps = page.getByTestId("health-feature-steps");
  await expect(steps).toContainText("걸음 수");
  await expect(steps).toContainText("캘린더");
  const body = page.getByTestId("health-feature-body");
  await expect(body).toContainText("체중 · 체성분");
  await expect(body).toContainText("마지막 동기화 · 아직 없음");
});

test("수면 항목은 구현 상태이며 웹에서는 연결 버튼이 잠긴다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/settings/health", { waitUntil: "networkidle" });
  const sleep = page.getByTestId("health-feature-sleep");
  await expect(sleep).toBeVisible({ timeout: 10_000 });
  await expect(sleep).not.toContainText("준비 중");
  await expect(page.getByTestId("health-connect-sleep")).toBeDisabled();
});

test("웹에서는 앱에서만 된다고 알리고 연결 버튼이 잠긴다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/settings/health", { waitUntil: "networkidle" });
  await expect(page.getByTestId("health-web-notice")).toBeVisible({
    timeout: 10_000,
  });
  // 눌러도 아무 일이 없는 버튼을 만들지 않는다.
  await expect(page.getByTestId("health-connect-steps")).toBeDisabled();
  await expect(page.getByTestId("health-connect-body")).toBeDisabled();
  await expect(page.getByTestId("health-connect-workout")).toBeDisabled();
  await expect(page.getByTestId("health-connect-run")).toBeDisabled();
  await expect(page.getByTestId("health-connect-heartRate")).toBeDisabled();
});

test("로그인 안 하면 로그인으로 보낸다", async ({ page }) => {
  await page.goto("/settings/health", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/login/);
});
