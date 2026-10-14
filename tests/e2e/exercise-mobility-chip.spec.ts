import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";

// 운동 종목 — "자세·가동성" 칩(2026-10-14). 부위 아래 흩어져 있던 운동을 한 번에 본다.
test("자세·가동성 칩을 누르면 월엔젤·힙 CARs 같은 운동만 한 묶음으로 보인다", async ({ page }) => {
  await createOnboardedAccount(page);
  await page.goto("/exercises", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /자세·가동성/ }).click();
  await expect(page.getByRole("heading", { name: "자세·가동성" })).toBeVisible();
  await expect(page.getByText("월엔젤 (월 엔젤)")).toBeVisible();
  await expect(page.getByText("힙 CARs (고관절 돌리기)")).toBeVisible();
  await expect(page.getByText("벤치프레스", { exact: true })).toHaveCount(0);
});
