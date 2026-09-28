import { test, expect } from "@playwright/test";
import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb, openAuthenticatedDbClient } from "./helpers/db";

test("즐겨찾기는 계정 DB에 저장되고 다른 계정에서는 읽거나 지울 수 없다", async ({ page, browser }) => {
  test.skip(!hasDb, "DB required"); test.setTimeout(180_000);
  const email = await createOnboardedAccount(page);
  const [user] = await dbQuery<{ id: string }>("select id from auth.users where email=$1", [email]);
  await dbQuery("insert into food_logs(user_id,for_date,meal,position,name,kcal,protein_g,carbs_g,fat_g,amount) values ($1,current_date,'breakfast',0,'즐겨찾기 검증 계란',80,6,1,5,'1개')", [user.id]);
  await page.goto("/diet/favorites", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "즐겨찾기 검증 계란 즐겨찾기 추가", exact: true }).click();
  await expect(page.getByRole("button", { name: "즐겨찾기 검증 계란 담기", exact: true })).toBeVisible();
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "즐겨찾기 검증 계란 담기", exact: true })).toBeVisible();
  await page.goto("/diet", { waitUntil: "networkidle" });
  await expect(page.getByTestId("quick-add").getByRole("button", { name: /즐겨찾기 검증 계란.*담기/ })).toBeVisible();
  const otherContext = await browser.newContext();
  try {
    const otherPage = await otherContext.newPage();
    const otherEmail = await createOnboardedAccount(otherPage);
    const client = await openAuthenticatedDbClient(otherEmail);
    try {
      expect((await client.query("select food from public.food_favorites where user_id=$1", [user.id])).rows).toEqual([]);
      expect((await client.query("delete from public.food_favorites where user_id=$1 returning user_id", [user.id])).rowCount).toBe(0);
    } finally { await client.query("rollback"); await client.end(); }
  } finally { await otherContext.close(); }
  await page.goto("/diet/favorites");
  await page.getByRole("button", { name: "즐겨찾기 검증 계란 즐겨찾기 해제" }).click();
  await expect(page.getByRole("button", { name: "즐겨찾기 검증 계란 담기", exact: true })).toHaveCount(0);
});

test("캘린더는 기존 일별 기록 주소와 식단 분석 주소를 통합한다", async ({ page }, info) => {
  test.skip(!hasDb, "DB required"); test.setTimeout(120_000);
  await createOnboardedAccount(page);
  await page.goto("/settings/history/2026-09-27", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/calendar\/2026-09-27$/);
  await expect(page.getByRole("region", { name: "런닝 기록" })).toBeVisible();
  await page.goto("/calendar");
  await page.getByRole("link", { name: /운동 기록 · 성장 그래프/ }).click();
  await expect(page).toHaveURL(/\/routine\/records$/);
  await page.goto("/diet/nutrition?days=7");
  await expect(page).toHaveURL(/\/diet\/history\?days=7$/);
  await expect(page.getByText("기록한 날의 하루 평균")).toBeVisible();
  await expect(page.locator(".app-splash")).toHaveCount(0);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(value => document.documentElement.classList.toggle("dark", value === "dark"), theme);
    await page.screenshot({ path: info.outputPath("diet-" + theme + ".png"), fullPage: true });
  }
  await page.goto("/settings/me");
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/routine/);
  await expect(page.getByRole("link", { name: /로그인/ }).first()).toBeVisible();
});
