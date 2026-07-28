import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 회귀: "오늘만 부위 추가"로 어깨만 더했으면, 편집기에서 **새 운동을 추가할 때 고를 수
 * 있는 부위**는 추가한 부위(어깨)뿐이어야 한다. 오늘 원래 부위(등)가 선택지로 나오면 안 된다.
 * 또한 부위 표시는 세부근육이 아니라 부위명("등"/"어깨")으로만 보여야 한다.
 */
const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test.describe.configure({ timeout: 180_000 });

async function openAdjust(page: Page) {
  for (const name of ["나중에", "다시는 안 보기"]) {
    const b = page.getByRole("button", { name });
    if (await b.count()) await b.first().click().catch(() => {});
  }
  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();
  await expect(
    page.getByRole("heading", { name: "오늘만 운동 바꾸기" }),
  ).toBeVisible({ timeout: 8000 });
}

test("부위 추가한 부위만 새 운동의 부위 선택지에 나온다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["back"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null,
            last_deferred_date=null, deferred_target=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [
    email,
  ]);
  await dbQuery(`delete from public.daily_plan where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'back', 0, 'lat-pulldown', 'machine', 4, 10, 40)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await openAdjust(page);
  await page.getByRole("button", { name: "어깨 전체", exact: true }).click();
  await page.getByRole("button", { name: "오늘만 부위 추가" }).click();
  await expect(page).toHaveURL(/\/plan\/today.*add=1/, { timeout: 30_000 });
  await page.waitForTimeout(1500);

  // 새 운동 한 줄 추가 → **새 행**은 추가한 부위(어깨)로만 담긴다.
  const rowsBefore = await page.getByLabel("운동").count();
  await page.getByRole("button", { name: "운동 추가" }).first().click();
  await page.waitForTimeout(500);
  expect(await page.getByLabel("운동").count()).toBe(rowsBefore + 1);

  // 새 행의 부위 표시에 '등'이 있으면 안 된다(추가하지 않은 부위).
  const newRow = page.locator("li, div").filter({ hasText: "어깨" }).last();
  await expect(newRow).toBeVisible();

  // 어떤 행이든 선택지는 (그 행의 현재 부위 + 추가한 부위) 뿐 — 다른 부위는 못 고른다.
  const selects = page.getByLabel("부위");
  for (const sel of await selects.all()) {
    const options = await sel.locator("option").allInnerTexts();
    const own = await sel.inputValue();
    for (const opt of options) {
      expect(["어깨", "등"]).toContain(opt.trim()); // 등 = 그 행 자신의 부위
    }
    expect(options.length).toBeLessThanOrEqual(2);
    expect(own).toBeTruthy();
  }

  // 부위 표시(드롭다운 옵션)는 세부근육이 아니라 부위명만 — "등 상부" 같은 라벨 없음.
  for (const sel of await selects.all()) {
    for (const opt of await sel.locator("option").allInnerTexts()) {
      expect(opt).not.toMatch(/상부|하부|광배근|승모근|사두|햄스트링/);
    }
  }
});
