import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 운동모드 · 이 종목의 지난 기록(2026-10-14) — 세트 사이에 한 번 눌러 보고, 돌아오면 운동모드가 다시 열린다.
const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("운동모드의 '지난 기록'을 누르면 그 종목의 기록 화면으로 가고, 뒤로 오면 운동모드가 다시 열린다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  const email = await signUpAndOnboard(page);
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["lower"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 3, 8, 60)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.getByTestId("workout-history-open").click();
  await expect(page).toHaveURL(/\/fit\/records\?ex=squat/, { timeout: 15_000 });

  await page.goBack();
  await expect(page.getByTestId("guided-scroll").getByRole("heading", { name: "스쿼트" })).toBeVisible({ timeout: 15_000 });
});
