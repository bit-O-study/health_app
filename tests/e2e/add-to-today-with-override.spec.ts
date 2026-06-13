import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 재현: 오늘 등(back)에 daily_plan 오버라이드(오늘만 변경)가 있는 상태에서 운동을
// 추가하면, 오늘 목록(=오버라이드)에 떠야 한다. 추가가 base 루틴으로 새면 오늘은
// 안 뜨고 오버라이드 없는 다른 날에만 떠서 "다른 일자에 추가" 버그가 된다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("오늘 등이 오늘만 변경(오버라이드) 상태여도 추가한 운동이 오늘 뜬다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest"],["chest"],["back"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=(${today} - 2), day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.daily_plan where user_id=${uid}`, [email]);
  // base 루틴 등(day 2) = 풀업
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 2, 'back', 0, 'pull-up', 'bodyweight', 4, 8, 0)`,
    [email],
  );
  // 오늘만 변경: 오늘 등을 바벨로우로 (daily_plan 오버라이드)
  await dbQuery(
    `insert into public.daily_plan
       (user_id, for_date, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, ${today}, 'back', 0, 'barbell-row', 'barbell', 4, 10, 40)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: "편집하기" }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "오늘 루틴에 운동 추가" }).click();
  await page.waitForTimeout(300);
  await page.getByLabel("운동").selectOption({ label: "데드리프트" });
  await page.getByRole("button", { name: "추가", exact: true }).click();
  await page.waitForTimeout(1500);

  const reRows = await dbQuery<{ day_index: number }>(
    `select day_index from public.routine_exercises
      where user_id=${uid} and exercise_id='deadlift'`,
    [email],
  );
  const dpRows = await dbQuery<{ for_date: string }>(
    `select for_date::text from public.daily_plan
      where user_id=${uid} and exercise_id='deadlift'`,
    [email],
  );
  console.log("deadlift routine_exercises day_index:", reRows.map((r) => r.day_index));
  console.log("deadlift daily_plan for_date:", dpRows.map((r) => r.for_date));

  // 오늘 목록에 데드리프트가 떠야 한다.
  await expect(page.getByText("데드리프트").first()).toBeVisible({ timeout: 8000 });
});
