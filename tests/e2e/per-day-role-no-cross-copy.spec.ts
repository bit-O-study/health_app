import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 같은 부위(등)가 1일차(보조) + 2일차(본운동) 두 일차에 걸칠 때,
// day_index 동기화가 한 일차만 채워진 상태에서 '다른 역할' 일차로 운동을 복사하면
// 본/보조가 뒤바뀐 것처럼 보였다(예전 버그). 동기화는 같은 역할(주/보조)끼리만
// 복사해야 하고, 역할이 다른 빈 일차는 비워 둬야 한다(사용자가 직접 등록).

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

// 1일차(idx0)=가슴+등(보조), 2일차(idx1)=등(본운동). flag=false → 진입 시 sync 실행.
async function setTwoBackDayRoutine(email: string) {
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest","back"],["back"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=false,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
}

async function backByDay(email: string) {
  const rows = await dbQuery<{ day_index: number; exercise_id: string }>(
    `select day_index, exercise_id from public.routine_exercises
      where user_id=${uid} and focus='back' order by day_index, position`,
    [email],
  );
  const at = (d: number) =>
    rows.filter((r) => r.day_index === d).map((r) => r.exercise_id);
  return { d0: at(0), d1: at(1) };
}

test("본운동(2일차)만 등록된 상태로 동기화해도 보조(1일차)로 복제되지 않는다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 1, 'back', 0, 'barbell-row', 'barbell', 4, 8, 50),
       (${uid}, 1, 'back', 1, 'lat-pulldown', 'machine', 4, 10, 40),
       (${uid}, 1, 'back', 2, 'deadlift', 'barbell', 4, 6, 80),
       (${uid}, 1, 'back', 3, 'seated-row', 'machine', 4, 10, 40)`,
    [email],
  );
  await setTwoBackDayRoutine(email);

  await page.goto("/plan", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const { d0, d1 } = await backByDay(email);
  expect(d1.length).toBe(4); // 본운동 그대로
  expect(d0).toEqual([]); // 보조는 비어 있음(본운동이 복제되지 않음)
});

test("보조(1일차)만 등록된 상태로 동기화해도 본운동(2일차)으로 복제되지 않는다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 0, 'back', 0, 'pull-up', 'bodyweight', 3, 8, null),
       (${uid}, 0, 'back', 1, 'assisted-pull-up', 'machine', 3, 10, 30)`,
    [email],
  );
  await setTwoBackDayRoutine(email);

  await page.goto("/plan", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const { d0, d1 } = await backByDay(email);
  expect(d0).toEqual(["pull-up", "assisted-pull-up"]); // 보조 그대로
  expect(d1).toEqual([]); // 본운동은 비어 있음(보조가 복제되지 않음)
});

test("양쪽 일차가 채워져 있으면 동기화 후에도 서로 안 섞인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 0, 'back', 0, 'pull-up', 'bodyweight', 3, 8, null),
       (${uid}, 0, 'back', 1, 'assisted-pull-up', 'machine', 3, 10, 30),
       (${uid}, 1, 'back', 0, 'barbell-row', 'barbell', 4, 8, 50),
       (${uid}, 1, 'back', 1, 'lat-pulldown', 'machine', 4, 10, 40)`,
    [email],
  );
  await setTwoBackDayRoutine(email);

  await page.goto("/plan", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const { d0, d1 } = await backByDay(email);
  expect(d0).toEqual(["pull-up", "assisted-pull-up"]);
  expect(d1).toEqual(["barbell-row", "lat-pulldown"]);
});