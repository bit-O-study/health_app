import { expect, test } from "@playwright/test";

// 운동 찾기(/exercises)는 로그인 후에만 노출된다. 비로그인 접근은 /login 으로 리다이렉트.
// (새 컨텍스트라 인증 쿠키가 없음 → 미들웨어 보호경로가 동작하는지 검증.)
test("비로그인 상태로 운동 찾기 접근 시 로그인으로 보낸다", async ({ page }) => {
  await page.goto("/exercises", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test("비로그인 상태로 운동 상세 접근 시 로그인으로 보낸다", async ({ page }) => {
  await page.goto("/exercises/bench-press", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/login(\?|$)/);
});
