import { expect, test, type Locator, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 회귀: "오늘만 변경" 상태에서 완료한 운동의 **완료 취소가 안 먹던** 문제.
 * 계획을 다시 담으면 행 UUID 가 새로 생기는데 완료기록은 사라진 옛 행 id 를 가리킨 채
 * 남는다. 화면은 (부위:운동) 폴백으로 완료로 보여주지만, 취소는 행 id 로만 지워서
 * 0건 삭제 → 계속 완료로 남았다. (bong9468@naver.com 랫풀다운 사례)
 */
const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test.describe.configure({ timeout: 180_000 });

/** 행을 오른쪽으로 스와이프 = 완료/취소 토글. (왼쪽 그립은 순서변경이라 피한다) */
async function swipeRight(page: Page, row: Locator) {
  await row.scrollIntoViewIfNeeded();
  const box = (await row.boundingBox())!;
  const y = box.y + box.height / 2;
  const startX = box.x + box.width * 0.45;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(startX + i * 16, y, { steps: 2 });
    await page.waitForTimeout(50);
  }
  await page.mouse.up();
  await page.waitForTimeout(2500);
}


async function dismissNudges(page: Page) {
  for (const name of ["나중에", "다시는 안 보기"]) {
    const b = page.getByRole("button", { name });
    if (await b.count()) await b.first().click().catch(() => {});
  }
  await page.waitForTimeout(300);
}

test("옛 행 id 를 가리키는 완료기록도 완료 취소가 된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["back"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [
    email,
  ]);
  await dbQuery(`delete from public.daily_plan where user_id=${uid}`, [email]);
  // 오늘만 변경 상태(daily_plan 이 오늘 계획) — 랫풀다운 1개.
  await dbQuery(
    `insert into public.daily_plan
       (user_id, for_date, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, ${today}, 'back', 0, 'lat-pulldown', 'machine', 4, 10, 40)`,
    [email],
  );
  // 완료기록은 **이미 사라진 옛 행 id** 를 가리킨다(계획을 다시 담기 전에 완료한 상태).
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, focus, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, ${today}, gen_random_uuid(), 'done', 'back', 'lat-pulldown', 'machine', 4, 10, 40)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await dismissNudges(page);

  const row = page.locator("li").filter({ hasText: "랫풀다운" }).first();
  await expect(row).toBeVisible();
  await expect(row.getByText("완료", { exact: true }).first()).toBeVisible();

  // 오른쪽으로 스와이프 = 완료 취소.
  await swipeRight(page, row);
  await page.waitForTimeout(2500);

  // DB 에서 완료기록이 실제로 지워져야 한다(예전엔 0건 삭제라 그대로 남았다).
  const left = await dbQuery<{ n: string }>(
    `select count(*)::text n from public.exercise_completions
      where user_id=${uid} and for_date=${today} and exercise_id='lat-pulldown'`,
    [email],
  );
  expect(Number(left[0].n)).toBe(0);

  // 새로고침해도 완료가 아니어야 한다.
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const rowAfter = page.locator("li").filter({ hasText: "랫풀다운" }).first();
  await expect(rowAfter.getByText("완료", { exact: true })).toHaveCount(0);
});
