import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";

// Regression coverage for the two schema-drift bugs:
//  1) 7일 루틴 저장 → splits=7 must pass user_routines_splits_check (was 0..6)
//  2) 세트별 다른 kg(피라미드) → set_details column must exist & persist
test.describe("routine + plan registration", () => {
  test("7일 루틴(splits=7) 저장이 성공한다", async ({ page }) => {
    await signUpAndOnboard(page);

    await page.goto("/settings/routine", { waitUntil: "networkidle" });
    const planner = page.locator('section:has-text("나의 루틴")').last();
    await planner.getByRole("button", { name: "7일 루틴" }).click();
    await page.getByText("직접 등록할게요").click(); // manual fill → redirects to /plan on success
    await planner.getByRole("button", { name: "저장" }).click();

    // success = navigation to /plan; constraint violation would keep us on the
    // routine page with a red error message.
    await page.waitForURL((u) => new URL(u).pathname === "/plan", { timeout: 20_000 });
    await expect(page).toHaveURL(/\/plan$/);
    await expect(page.locator("p.text-red-600, p.text-red-400")).toHaveCount(0);
  });

  test("세트별 다른 kg(피라미드) 등록이 저장·영속된다", async ({ page }) => {
    await signUpAndOnboard(page);
    await page.goto("/plan", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    const section = page
      .locator("section.rounded-xl")
      .filter({ has: page.getByRole("button", { name: "운동 추가" }) })
      .first();
    await section.getByRole("button", { name: "운동 추가" }).click();
    await section.getByRole("button", { name: "세트별 다르게" }).first().click();

    // ensure 3 set-rows
    const wInputs = section.locator('input[aria-label$="세트 무게(kg)"]');
    const addSet = section.getByRole("button", { name: "세트 추가" }).first();
    while ((await wInputs.count()) < 3) await addSet.click();

    const want = ["40", "50", "60"];
    for (let i = 0; i < 3; i++) await wInputs.nth(i).fill(want[i]);

    // main "저장" is the first 저장 in the section (others are warmup/cooldown)
    await section.getByRole("button", { name: "저장" }).first().click();
    await expect(page.getByText(/저장됨/)).toBeVisible({ timeout: 10_000 });

    // reload → values must persist (proves set_details column write)
    await page.goto("/plan", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const reSection = page
      .locator("section.rounded-xl")
      .filter({ has: page.locator('input[aria-label$="세트 무게(kg)"]') })
      .first();
    const persisted = await reSection
      .locator('input[aria-label$="세트 무게(kg)"]')
      .evaluateAll((els) => (els as HTMLInputElement[]).map((e) => e.value));
    expect(persisted).toEqual(want);
  });
});
