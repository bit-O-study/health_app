import { expect, test } from "@playwright/test";
import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

test("모든 끼니 검색창 포커스와 구운계란 개수·중량 저장", async ({ page }, testInfo) => {
  test.skip(!hasDb, "needs DB");
  test.setTimeout(300_000);
  const email = await createOnboardedAccount(page);
  await page.route("**/api/foods/search?**", async (route) => {
    const url = new URL(route.request().url());
    const rows = url.searchParams.get("source") === "custom" && url.searchParams.get("q")?.includes("맥반석")
      ? [{ id: "test-roasted-egg", name: "맥반석으로 맛있게 구운계란", category: "기타", amount: "100g", kcal: 138, protein: 15, carbs: 2.5, fat: 7.5 }]
      : [];
    await route.fulfill({ json: rows });
  });
  await page.goto("/diet");
  for (const scheme of ["light", "dark"]) {
    await page.evaluate((s) => document.documentElement.classList.toggle("dark", s === "dark"), scheme);
    for (let meal = 0; meal < 4; meal++) {
      await page.getByRole("button", { name: "추가", exact: true }).nth(meal).click();
      const dialog = page.getByRole("dialog", { name: ["아침 추가", "점심 추가", "저녁 추가", "간식 추가"][meal] });
      await expect(dialog).toBeVisible();
      await expect.poll(async () => {
        const box = (await dialog.boundingBox())!;
        return { y: Math.round(box.y), height: Math.round(box.height) };
      }).toEqual({ y: 0, height: page.viewportSize()!.height });
      await expect(dialog.getByRole("button", { name: "검색", exact: true })).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      const search = page.getByRole("textbox", { name: "음식 검색", exact: true });
      await expect(search).toBeFocused();
      await expect(search).toHaveCSS("outline-style", "none");
      await expect(search).toHaveCSS("box-shadow", "none");
      if (meal === 0) await page.screenshot({ path: testInfo.outputPath(`search-${scheme}.png`) });
      await page.getByRole("button", { name: "닫기", exact: true }).click();
    }
  }
  await page.getByRole("button", { name: "추가", exact: true }).first().click();
  await page.getByRole("textbox", { name: "음식 검색", exact: true }).fill("맥반석");
  await page.getByRole("button", { name: /맥반석으로 맛있게 구운계란/ }).click();
  await expect(page.getByRole("spinbutton", { name: "계란 개수" })).toHaveValue("1");
  await expect(page.getByText("69 kcal", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "2개", exact: true }).click();
  await expect(page.getByText("138 kcal", { exact: true })).toBeVisible();
  await page.getByRole("spinbutton", { name: "1개 중량(g)" }).fill("45");
  await expect(page.getByText("124 kcal", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("egg-quantity.png") });
  await page.getByRole("button", { name: "담기", exact: true }).click();
  await expect.poll(async () => {
    const rows = await dbQuery<{ amount: string; kcal: string }>(
      "select amount, kcal::text from public.food_logs where user_id=(select id from auth.users where email=$1) and name=$2",
      [email, "맥반석으로 맛있게 구운계란"],
    );
    return rows.map((r) => ({ amount: r.amount, kcal: Number(r.kcal) }));
  }).toEqual([{ amount: "2개(90g)", kcal: 124 }]);
});
