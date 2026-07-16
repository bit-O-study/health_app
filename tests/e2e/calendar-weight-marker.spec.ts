import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 실제로 웨이트(근력 운동)을 완료한 날은 캘린더에 덤벨 마커('웨이트한 날')가 떠야 한다.
// 완료 기록이 없는 날엔 마커가 없다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("웨이트 완료한 날은 캘린더에 덤벨 마커가 뜬다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await dbQuery(`update public.profiles set lock_weight_reps=true where user_id=${uid}`, [email]);
  await dbQuery(
    `update public.user_routines set splits=0, variant_id='custom',
        custom_week='[["lower"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
        start_date=${today}, day_index_migrated=true, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60)`,
    [email],
  );

  // 완료 전: 캘린더에 덤벨 마커 없음.
  await page.goto("/calendar", { waitUntil: "networkidle" });
  await expect(page.getByLabel("웨이트한 날")).toHaveCount(0);

  // 근력 운동 완료(메인 '오늘 전부 완료').
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const row = page.locator("li").filter({ hasText: "스쿼트" }).first();
  await expect(row).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: /오늘 전부 완료/ }).click();
  await expect(row.getByText("완료", { exact: true })).toBeVisible({ timeout: 8000 });

  // 완료 후: 캘린더에 덤벨 마커가 최소 1개(오늘) 뜬다.
  await page.goto("/calendar", { waitUntil: "networkidle" });
  await expect(page.getByLabel("웨이트한 날").first()).toBeVisible({ timeout: 8000 });
});