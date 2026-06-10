import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 메인 화면 편집 모드 삭제도 일차별 독립이어야 한다. 같은 부위(등)가 두 일차에
// 있고 둘 다 같은 운동(랫풀다운)이 등록돼 있어도, 오늘 일차에서 삭제하면 다른 일차의
// 행은 그대로여야 한다. (사용자 보고: 메인 편집으로 삭제 시 다른 날에도 반영)

async function backByDay(email: string) {
  return dbQuery<{ day_index: number; exercise_id: string }>(
    `select day_index, exercise_id from public.routine_exercises
       where user_id=(select id from auth.users where lower(email)=lower($1))
         and focus='back' order by day_index, position`,
    [email],
  );
}

test("메인 편집 삭제도 일차별 독립 — 다른 날 같은 운동은 안 지워진다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["back"],["back"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            day_index_migrated=true, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [
    email,
  ]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 0, 'back', 0, 'lat-pulldown', 'machine', 3, 10, 40),
       (${uid}, 0, 'back', 1, 'barbell-row', 'barbell', 3, 10, 40),
       (${uid}, 1, 'back', 0, 'lat-pulldown', 'machine', 3, 10, 40),
       (${uid}, 1, 'back', 1, 'barbell-row', 'barbell', 3, 10, 40)`,
    [email],
  );

  // 오늘(0일차) 메인 → 편집 → 랫풀다운 체크 → 삭제
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "편집하기" }).click();
  await page
    .locator("li")
    .filter({ hasText: "랫풀다운" })
    .first()
    .getByRole("checkbox")
    .check();
  await page.getByRole("button", { name: /삭제/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
  await page.waitForTimeout(1200);

  const after = await backByDay(email);
  const day0 = after.filter((r) => r.day_index === 0).map((r) => r.exercise_id);
  const day1 = after.filter((r) => r.day_index === 1).map((r) => r.exercise_id);
  // 오늘(0일차)은 랫풀다운 삭제, 다른 날(1일차)은 그대로.
  expect(day0).not.toContain("lat-pulldown");
  expect(day1).toContain("lat-pulldown");
});
