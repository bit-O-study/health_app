import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 식단 **빠른 기록**(2026-09-25 UI 리뉴얼) — 검색 없이 한 번에 담기.
 *
 * 여기서 확인하는 것 셋:
 *  ① 최근에 먹은 것이 칩으로 올라오고, 한 번 누르면 그 끼니에 담긴다
 *  ② '어제 아침 그대로 담기' 가 그날 담았던 것들을 통째로 옮긴다
 *  ③ 둘 다 화면 상태가 아니라 **기록**이다(새로고침해도 남는다)
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const YESTERDAY = `((now() at time zone 'Asia/Seoul')::date - 1)`;

/** 어제 아침에 먹은 것으로 심는다 — 빠른 기록의 재료. */
async function seedYesterdayBreakfast(email: string) {
  await dbQuery(
    `insert into public.food_logs
       (user_id, for_date, meal, position, name, kcal, protein_g, carbs_g, fat_g, amount, eaten_at)
     values
       (${uid}, ${YESTERDAY}, 'breakfast', 0, '테스트토스트', 250, 8, 30, 9, '2쪽', '08:10'),
       (${uid}, ${YESTERDAY}, 'breakfast', 1, '테스트우유',   130, 7,  9, 7, '200ml', '08:10')`,
    [email],
  );
}

async function loggedNames(email: string): Promise<string[]> {
  const rows = await dbQuery<{ name: string }>(
    `select name from public.food_logs
      where user_id=${uid} and for_date=(now() at time zone 'Asia/Seoul')::date
      order by meal, position`,
    [email],
  );
  return rows.map((r) => r.name);
}

test("자주 먹는 음식은 칩 한 번으로 담긴다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedYesterdayBreakfast(email);

  await page.goto("/diet", { waitUntil: "networkidle" });
  const quick = page.getByTestId("quick-add");
  await expect(quick).toBeVisible({ timeout: 8000 });

  // 담을 끼니를 아침으로 — 시계가 고른 기본값이 무엇이든 여기선 아침을 본다.
  await quick.getByTestId("quick-meal").filter({ hasText: "아침" }).click();

  const chip = quick.getByTestId("quick-food").filter({ hasText: "테스트토스트" });
  await expect(chip).toBeVisible();
  await chip.click();

  // 끼니 목록에 바로 나타난다(낙관적).
  await expect(page.getByRole("button", { name: "아침 게시물 열기" })).toContainText(
    "테스트토스트",
    { timeout: 8000 },
  );

  // 🔴 화면 상태가 아니라 기록이다.
  await expect
    .poll(() => loggedNames(email), { timeout: 10000 })
    .toEqual(["테스트토스트"]);

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "아침 게시물 열기" })).toContainText(
    "테스트토스트",
    { timeout: 8000 },
  );
});

test("어제 먹은 끼니를 통째로 그대로 담는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedYesterdayBreakfast(email);

  await page.goto("/diet", { waitUntil: "networkidle" });
  const quick = page.getByTestId("quick-add");
  await expect(quick).toBeVisible({ timeout: 8000 });
  await quick.getByTestId("quick-meal").filter({ hasText: "아침" }).click();

  const copy = quick.getByTestId("quick-copy");
  await expect(copy).toContainText("어제 아침 그대로 담기");
  await expect(copy).toContainText("380kcal"); // 250 + 130
  await copy.click();

  await expect
    .poll(() => loggedNames(email), { timeout: 12000 })
    .toEqual(["테스트토스트", "테스트우유"]);

  // 새로고침해도 두 줄 그대로 — 그리고 칼로리 합계에 반영된다.
  await page.reload({ waitUntil: "networkidle" });
  const breakfast = page.getByRole("button", { name: "아침 게시물 열기" });
  await expect(breakfast).toContainText("테스트토스트", { timeout: 8000 });
  await expect(breakfast).toContainText("테스트우유");
  await expect(breakfast).toContainText("380 kcal");
});

test("기록이 없는 계정에는 권하지 않는다 — 빈 칩을 두지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/diet", { waitUntil: "networkidle" });
  const quick = page.getByTestId("quick-add");
  await expect(quick).toBeVisible({ timeout: 8000 });
  await expect(quick.getByTestId("quick-food")).toHaveCount(0);
  await expect(quick.getByTestId("quick-copy")).toHaveCount(0);
  await expect(quick).toContainText("며칠 기록하면");
});

test("음식 검색을 열면 '최근 먹은 것'이 맨 위에 있다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedYesterdayBreakfast(email);

  await page.goto("/diet", { waitUntil: "networkidle" });
  await expect(page.getByTestId("quick-add")).toBeVisible({ timeout: 8000 });

  // 아침 줄의 '추가' → 검색 화면
  await page
    .getByRole("button", { name: "아침 게시물 열기" })
    .or(page.getByRole("button", { name: /^추가$/ }).first())
    .waitFor({ state: "attached" });
  await page.getByRole("button", { name: /^추가$/ }).first().click();

  const recent = page.getByTestId("recent-foods");
  await expect(recent).toBeVisible({ timeout: 8000 });
  await recent.getByRole("button", { name: "테스트우유 담기" }).click();

  await expect
    .poll(() => loggedNames(email), { timeout: 10000 })
    .toEqual(["테스트우유"]);
});
