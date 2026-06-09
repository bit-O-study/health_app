import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 루틴을 바꿔 행의 day_index 가 현재 루틴과 어긋나면(드리프트), 다음 진입 시
// 현재 루틴의 일차에 맞춰 재정렬되어야 한다. (하체 편집이 다른 하체에 새던 버그)

test("day_index 드리프트는 다음 진입 시 현재 루틴 일차로 재정렬된다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  // 시드(아무 루틴)
  await seedRecommendedExercises(page);

  // 드리프트 모사: routine_exercises 를 비우고 하체 운동을 'day_index=2' 에만 넣는다.
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [
    email,
  ]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 2, 'lower', 0, 'squat', 'barbell', 3, 10, 40),
       (${uid}, 2, 'lower', 1, 'leg-press', 'machine', 3, 12, 60),
       (${uid}, 2, 'lower', 2, 'leg-curl', 'machine', 3, 12, 30)`,
    [email],
  );
  // 현재 루틴: 하체가 1일차(index0)에만. 행은 day2 에 있으니 드리프트. 플래그 false.
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["lower"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            day_index_migrated=false, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );

  // /routine 진입 → ensureDayIndexBackfilled 가 현재 루틴 기준으로 재정렬
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // 하체 행이 day0 으로 옮겨지고(UUID 보존 이동), day2 엔 없어야 한다.
  const rows = await dbQuery<{ day_index: number; n: string }>(
    `select day_index, count(*)::text n from public.routine_exercises
      where user_id=${uid} and focus='lower' group by day_index order by day_index`,
    [email],
  );
  const map = new Map(rows.map((r) => [r.day_index, Number(r.n)]));
  expect(map.get(0)).toBe(3); // 현재 루틴 일차(0)로 이동
  expect(map.get(2) ?? 0).toBe(0); // 드리프트 일차는 비워짐
});
