// 회귀: 같은 부위에 같은 운동이 2개 있고 1개만 완료했을 때, 완료 기록이 행마다
// (부위:운동) 키로 폴백 매칭돼 둘 다 '완료'로 뜨던 버그(과매칭). assignCompletions 가
// 완료 기록을 행에 1:1 배정하므로 완료 기록 수만큼만 done 이어야 한다.
import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("같은 운동 2개 중 1개만 완료하면 나머지는 완료 아님(과매칭 확인)", async ({ page }) => {
  test.skip(!hasDb, "needs db");
  const email = await signUpAndOnboard(page);
  await dbQuery(
    `update public.user_routines set splits=0, variant_id='custom',
        custom_week='[["chest"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
        start_date=${today}, day_index_migrated=true, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.exercise_completions where user_id=${uid}`, [email]);
  // 같은 부위(chest)에 벤치프레스 2개 (position 0,1)
  await dbQuery(
    `insert into public.routine_exercises (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'chest', 0, 'bench-press', 'barbell', 4, 8, 40),
            (${uid}, 0, 'chest', 1, 'bench-press', 'barbell', 4, 8, 60)`,
    [email],
  );
  // 첫 번째(position 0, 40kg) 행만 완료 처리
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, focus, exercise_id, equipment, sets, reps, weight_kg)
     select user_id, ${today}, id, 'done', focus, exercise_id, equipment, sets, reps, weight_kg
       from public.routine_exercises where user_id=${uid} and weight_kg=40`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 벤치프레스 행은 2개. '완료' 배지는 정확히 1개여야 한다(2개면 과매칭 버그).
  const benchRows = page.locator("li").filter({ hasText: "벤치프레스" });
  await expect(benchRows.first()).toBeVisible({ timeout: 8000 });
  const doneCount = await benchRows.getByText("완료", { exact: true }).count();
  console.log("DONE_BADGES:", doneCount, "of", await benchRows.count(), "bench rows");
  expect(doneCount).toBe(1);
});
