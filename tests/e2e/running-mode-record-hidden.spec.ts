import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// #16/17/18: 런닝모드 기록(완료기록만, 마무리 '플랜' 행 없음)은 마무리운동 목록에 뜨지 않는다
// (캘린더·운동점수에만). 루틴/오늘만 편집으로 추가한 마무리 런닝은 목록에 뜬다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function setupChestToday(email: string) {
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.daily_conditioning where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'chest', 0, 'bench-press', 'barbell', 4, 8, 60)`,
    [email],
  );
}

test("런닝모드 기록(완료기록만)은 마무리운동 목록에 안 뜬다(#16/17)", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await setupChestToday(email);

  // 런닝모드 기록 모사 — daily_conditioning(플랜 행) 없이 완료기록만 남긴다.
  await dbQuery(
    `insert into public.conditioning_completions
       (user_id, for_date, kind, item_id, source_row_id, status, duration_min)
     values (${uid}, ${today}, 'cooldown', 'running', gen_random_uuid(), 'done', 20)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 마무리운동 목록에 '런닝' 이 뜨면 안 된다(고스트 재출현 X).
  await expect(page.getByText("런닝", { exact: true })).toHaveCount(0);

  // 완료기록은 DB에 그대로(캘린더·점수용).
  const comp = await dbQuery<{ n: string }>(
    `select count(*)::text n from public.conditioning_completions
      where user_id=${uid} and for_date=${today} and item_id='running'`,
    [email],
  );
  expect(Number(comp[0].n)).toBe(1);
});

test("루틴에서 추가한 마무리 런닝은 목록에 뜬다(#18)", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await setupChestToday(email);

  // 루틴 마무리(쿨다운)에 런닝 추가 — 이건 목록에 보여야 한다.
  await dbQuery(
    `insert into public.routine_conditioning
       (user_id, focus, kind, position, item_id, duration_min)
     values (${uid}, 'chest', 'cooldown', 0, 'running', 15)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 마무리운동에 '런닝' 이 보여야 한다.
  await expect(page.getByText("런닝", { exact: true }).first()).toBeVisible();
});
