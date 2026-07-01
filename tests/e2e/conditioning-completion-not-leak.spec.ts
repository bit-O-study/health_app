import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 버그4: 워밍업/마무리 완료가 루틴(부위)을 바꿔도 '종류 단위'로 번져, 새 루틴의
// 다른 워밍업까지 완료로 표시되던 문제. 이제 본운동과 동일하게 (종류:항목)로만 매칭한다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("부위를 바꾸면 다른 워밍업은 완료로 번지지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 오늘=하체. 하체 워밍업=런닝, 가슴 워밍업=캣카우(서로 다른 항목).
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["lower"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.conditioning_completions where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.daily_plan where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60)`,
    [email],
  );
  await dbQuery(
    `insert into public.routine_conditioning (user_id, focus, kind, position, item_id, duration_min)
     values (${uid}, 'lower', 'warmup', 0, 'running', 5),
            (${uid}, 'chest', 'warmup', 0, 'cat-cow', null)`,
    [email],
  );
  // 하체 워밍업(런닝) 완료.
  await dbQuery(
    `insert into public.conditioning_completions (user_id, for_date, kind, item_id, source_row_id, status)
     select user_id, ${today}, kind, item_id, id, 'done'
       from public.routine_conditioning where user_id=${uid} and kind='warmup' and item_id='running'`,
    [email],
  );
  // "오늘만 가슴으로 전체 바꾸기" 모사 — 오늘 daily_plan 을 가슴 본운동으로.
  await dbQuery(
    `insert into public.daily_plan (user_id, for_date, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, ${today}, 'chest', 0, 'bench-press', 'barbell', 4, 8, 40)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 오늘은 가슴 → 가슴 워밍업(캣카우)이 보이고, 그건 완료가 아니어야 한다(런닝 완료가 번지면 안 됨).
  const catRow = page.locator("li").filter({ hasText: "캣카우" }).first();
  await expect(catRow).toBeVisible({ timeout: 8000 });
  await expect(catRow.getByText("완료", { exact: true })).toHaveCount(0);
});

test("같은 종목(런닝)이 여러 개면 하나만 완료해도 나머지는 미완료다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 오늘=하체. 마무리(쿨다운)에 '런닝' 2개 — 경사/속도/시간만 다르고 종목(item_id)은 같다.
  // (실제 버그 재현: 하나를 완료하면 (종류:항목) 키 폴백이 형제 런닝까지 완료로 만들거나,
  //  저장 시 형제 완료기록을 지워 캘린더에서 사라지던 문제. 이제 행 단위 1:1 배정.)
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["lower"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.conditioning_completions where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.daily_conditioning where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60)`,
    [email],
  );
  // 런닝 2개: (20분/속도5/경사10) 과 (10분/속도9/경사0).
  await dbQuery(
    `insert into public.routine_conditioning
       (user_id, focus, kind, position, item_id, duration_min, speed, incline)
     values (${uid}, 'lower', 'cooldown', 0, 'running', 20, 5, 10),
            (${uid}, 'lower', 'cooldown', 1, 'running', 10, 9, 0)`,
    [email],
  );
  // 첫 번째(경사10/속도5) 런닝만 완료.
  await dbQuery(
    `insert into public.conditioning_completions
       (user_id, for_date, kind, item_id, source_row_id, status, duration_min, speed, incline)
     select user_id, ${today}, kind, item_id, id, 'done', duration_min, speed, incline
       from public.routine_conditioning
      where user_id=${uid} and kind='cooldown' and item_id='running' and incline=10`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 런닝 행이 2개 보이고, 그 중 '완료' 배지는 정확히 1개여야 한다(형제까지 번지면 안 됨).
  const runRows = page.locator("li").filter({ hasText: "런닝" });
  await expect(runRows.first()).toBeVisible({ timeout: 8000 });
  await expect(
    runRows.getByText("완료", { exact: true }),
  ).toHaveCount(1);
});

test("본운동도 부위를 바꾸면 새 부위 운동은 완료로 안 뜬다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["lower"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.exercise_completions where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.daily_plan where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60)`,
    [email],
  );
  // 하체 스쿼트 완료.
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, focus, exercise_id, equipment, sets, reps, weight_kg)
     select user_id, ${today}, id, 'done', focus, exercise_id, equipment, sets, reps, weight_kg
       from public.routine_exercises where user_id=${uid} and exercise_id='squat'`,
    [email],
  );
  // 가슴으로 전체 바꾸기 모사.
  await dbQuery(
    `insert into public.daily_plan (user_id, for_date, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, ${today}, 'chest', 0, 'bench-press', 'barbell', 4, 8, 40)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 새 부위(가슴) 본운동(벤치프레스)은 완료가 아니어야 한다.
  const benchRow = page.locator("li").filter({ hasText: "벤치프레스" }).first();
  await expect(benchRow).toBeVisible({ timeout: 8000 });
  await expect(benchRow.getByText("완료", { exact: true })).toHaveCount(0);
  // (완료한 스쿼트는 버그1 동작대로 완료 배지로 그대로 남는다)
  const squatRow = page.locator("li").filter({ hasText: "스쿼트" }).first();
  await expect(squatRow.getByText("완료", { exact: true }).first()).toBeVisible();
});