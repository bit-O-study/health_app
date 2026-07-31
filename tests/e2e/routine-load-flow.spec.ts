import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { hasDb } from "./helpers/db";

// 운동 탭 진입 흐름 회귀:
//  ① 웹 브라우저에선 '보던 화면 복원'(RouteKeeper, 네이티브 전용)이 돌면 안 된다.
//     window.Capacitor 는 웹에도 주입돼서, 존재만으로 앱 판별을 하던 시절엔 운동 탭을
//     새로 열 때마다 직전에 보던 화면으로 튕겼다.
//  ② '오늘 할 운동'이 스켈레톤부터 떴다가 나중에 채워지면 안 된다(한 번에 완성해서 보낸다).

test("운동 탭을 새로 열어도 직전 화면으로 튕기지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  // @capacitor/core 가 **웹에서도** 주입하는 형태를 그대로 재현(platform: "web").
  // 실제 앱에선 이 주입이 청크 로드 타이밍에 달려 있어 증상이 들쭉날쭉했다 —
  // 여기선 항상 주입해 두고, 그래도 복원이 안 도는지(= 앱 판별이 옳은지) 못 박는다.
  await page.addInitScript(() => {
    (window as unknown as { Capacitor: unknown }).Capacitor = {
      isNativePlatform: () => false,
      getPlatform: () => "web",
    };
  });

  // 다른 화면을 보다가(= lastRoute 저장) 운동 탭을 하드 로드.
  await page.goto("/settings", { waitUntil: "networkidle" });
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // 복원이 있었다면 이 사이에 replace 가 돈다.

  await expect(page).toHaveURL(/\/routine$/);
  await expect(page.getByRole("heading", { name: "오늘 할 운동" })).toBeVisible({
    timeout: 8000,
  });
});

test("오늘 할 운동은 첫 응답에 완성된 채로 온다(스켈레톤 없음)", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  // 브라우저 컨텍스트의 로그인 쿠키를 그대로 써서 문서 HTML 을 직접 받는다.
  const res = await page.request.get("/routine");
  expect(res.ok()).toBe(true);
  const html = await res.text();

  // 운동 목록이 문서에 서버렌더돼 있어야 한다(클라이언트에서 나중에 채우는 게 아니라).
  expect(html).toContain("오늘 할 운동");
  // 예전 Suspense 스켈레톤(<section aria-label="오늘 운동 불러오는 중">)의 표식.
  // 라우트 전환 스피너(loading.tsx)는 같은 문구를 '텍스트'로 쓰므로 aria-label 로 구분한다.
  expect(html).not.toContain('aria-label="오늘 운동 불러오는 중"');
});
