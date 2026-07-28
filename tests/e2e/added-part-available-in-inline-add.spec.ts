import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 회귀: "오늘만 부위 추가"로 팔(이두)을 더한 뒤 **아무것도 안 담고** 메인으로 돌아와도,
 * 편집 → '오늘 루틴에 운동 추가' 에서 그 부위(팔)를 고를 수 있어야 한다.
 * 그리고 그 추가는 **오늘만**(daily_plan) 반영 — 영구 루틴(routine_exercises)은 그대로.
 */
const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test.describe.configure({ timeout: 180_000 });

async function dismissNudges(page: Page) {
  for (const name of ["나중에", "다시는 안 보기"]) {
    const b = page.getByRole("button", { name });
    if (await b.count()) await b.first().click().catch(() => {});
  }
  await page.waitForTimeout(300);
}

test("부위 추가만 하고 안 담아도 그 부위로 운동을 추가할 수 있다(오늘만)", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["back"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null,
            last_deferred_date=null, deferred_target=null,
            today_added_date=null, today_added_blocks=null
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

  // 오늘만 부위 추가 → 팔(이두) 선택 → 편집기로 갔다가 아무것도 안 담고 메인으로.
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await dismissNudges(page);
  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();
  await page.getByRole("button", { name: "이두", exact: true }).click();
  await page.getByRole("button", { name: "오늘만 부위 추가" }).click();
  await expect(page).toHaveURL(/\/plan\/today.*add=1/, { timeout: 30_000 });
  await page.waitForTimeout(1000);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await dismissNudges(page);

  // 편집 → '오늘 루틴에 운동 추가' 에서 팔을 고를 수 있어야 한다.
  await page.getByRole("button", { name: "편집하기" }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "오늘 루틴에 운동 추가" }).click();
  await page.waitForTimeout(400);

  const partSelect = page.getByLabel("부위").first();
  await expect(partSelect).toBeVisible();
  const options = await partSelect.locator("option").allInnerTexts();
  expect(options).toContain("팔"); // 추가한 부위(이두 → 큰 카테고리 '팔')
  expect(options).not.toContain("가슴"); // 안 고른 부위는 없어야

  // 이두 운동으로 목록이 좁혀졌는지(삼두 전용 운동이 없어야).
  const exerciseNames = await page
    .getByLabel("운동")
    .first()
    .locator("option")
    .allInnerTexts()
    .catch(() => [] as string[]);
  if (exerciseNames.length > 0) {
    expect(exerciseNames.some((n) => n.includes("킥백"))).toBe(false);
  }
});
