import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test.describe.configure({ timeout: 180_000 });

test("장기 정체 대체운동은 오늘 계획만 바꾸고 영구 루틴은 유지한다", async ({
  page,
}) => {
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
  await dbQuery(`update public.profiles set experience='advanced' where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.daily_plan where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 5, 6, 100)`,
    [email],
  );

  // 첫 기록 뒤 최고치가 다섯 세션 동안 늘지 않으면 '휴식/대체' 추천이 된다.
  for (const daysAgo of [42, 35, 28, 21, 14, 7]) {
    await dbQuery(
      `insert into public.exercise_completions
         (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus, sets, reps, weight_kg)
       values (${uid}, ${today} - $2::int, gen_random_uuid(), 'done', 'squat', 'barbell', 'lower', 5, 6, 100)`,
      [email, daysAgo],
    );
  }

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "운동 시작" }).click();

  const recommendations = page.getByRole("region", { name: "추천 대체운동" });
  await expect(recommendations).toBeVisible();
  await expect(recommendations).toContainText("오늘 계획만 바뀌고 영구 루틴은 유지");

  const apply = recommendations.getByRole("button", {
    name: "오늘만 이 운동으로 변경",
  }).first();
  const testId = await apply.getAttribute("data-testid");
  const replacementId = testId?.replace("substitute-apply-", "");
  expect(replacementId).toBeTruthy();
  expect(replacementId).not.toBe("squat");
  await apply.click();

  // 이미 시작한 세션을 대체 적용으로 닫았으므로 새 세션의 '운동 시작'이 아니라
  // 기존 세션을 이어가는 '다시 운동하기'가 정상 상태다.
  await expect(page.getByRole("button", { name: "다시 운동하기" })).toBeVisible();
  const daily = await dbQuery<{ exercise_id: string }>(
    `select exercise_id from public.daily_plan
      where user_id=${uid} and for_date=${today} order by position`,
    [email],
  );
  expect(daily.map((row) => row.exercise_id)).toContain(replacementId!);
  expect(daily.map((row) => row.exercise_id)).not.toContain("squat");

  const permanent = await dbQuery<{ exercise_id: string }>(
    `select exercise_id from public.routine_exercises
      where user_id=${uid} order by position`,
    [email],
  );
  expect(permanent.map((row) => row.exercise_id)).toEqual(["squat"]);
});
