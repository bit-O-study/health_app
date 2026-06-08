import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 보조(사이드) 볼륨: 한 일차에 주 부위(가슴) + 보조 부위(삼두)를 두면,
// 주 부위는 풀 볼륨(~5개), 보조는 2개만 추천돼야 한다. 또 삼두 보조는
// 삼두 운동(arm 톤, triceps 블록)으로 채워진다.

type Row = { exercise_id: string };

test("사이드로 붙인 삼두는 2개만, 삼두 운동으로 채워진다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 커스텀 루틴: 0일차 = 가슴 + 삼두(보조), 나머지 휴식. 기준일=오늘.
  const week = [
    ["chest", "triceps"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
  ];
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom', custom_week=$2::jsonb,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            rest_date=null, override_date=null, override_block=null
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email, JSON.stringify(week)],
  );

  await seedRecommendedExercises(page);

  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  // 가슴(주) — 풀 볼륨(4개 이상)
  const chest = await dbQuery<Row>(
    `select exercise_id from public.routine_exercises
      where user_id=${uid} and day_index=0 and focus='chest'`,
    [email],
  );
  expect(chest.length).toBeGreaterThanOrEqual(4);

  // 삼두(보조) — arm 톤, 정확히 2개, 삼두 운동
  const arm = await dbQuery<Row>(
    `select exercise_id from public.routine_exercises
      where user_id=${uid} and day_index=0 and focus='arm' order by position`,
    [email],
  );
  expect(arm.map((r) => r.exercise_id)).toEqual([
    "triceps-pushdown",
    "skull-crusher",
  ]);
});
