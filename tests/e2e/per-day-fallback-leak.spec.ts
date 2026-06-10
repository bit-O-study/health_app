import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 회귀 가드: 월요일(0일차) 하체에만 운동이 등록돼 있고 화요일(1일차) 하체가 비어 있어도,
// 화요일 화면은 월요일 운동을 '공유'하면 안 된다(과거엔 getPlanForFocus 폴백으로 공유돼
// 월요일에서 삭제하면 화요일에서도 사라지는 누수가 있었다). 자기 일차에 운동이 없으면
// 빈 화면(등록 안내)을 보여준다.

test("미등록 일차는 다른 일차 운동을 공유하지 않는다(삭제 누수 방지)", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  // 루틴: 월·화 모두 하체. 기준일을 어제로 → 오늘 = 1일차(화요일).
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["lower"],["lower"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=((now() at time zone 'Asia/Seoul')::date - 1),
            day_index_migrated=true, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  // 월요일(0일차) 하체에만 운동 등록 — 화요일(1일차)은 비움.
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [
    email,
  ]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 0, 'lower', 0, 'leg-press', 'machine', 3, 10, 100),
       (${uid}, 0, 'lower', 1, 'squat', 'barbell', 3, 10, 60)`,
    [email],
  );

  // 오늘(화요일/1일차) 메인 화면 — 1일차 하체는 비어 있는데 폴백으로 월요일 운동이 뜬다.
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const main = page.locator("ul.space-y-2").filter({ hasText: "레그프레스" });
  // 폴백이 살아있으면 화요일에 월요일의 레그프레스가 보인다(= 공유 = 누수 원인).
  const legPressVisible = await main.count();
  console.log("화요일 화면에 월요일 레그프레스 표시(폴백):", legPressVisible);

  // 기대(수정 후): 화요일 1일차는 자기 운동이 없으면 '비어 있음'을 보여야 하고
  // 월요일 운동을 공유하면 안 된다.
  await expect(
    page.getByText("등록된 본운동이 없습니다", { exact: false }),
  ).toBeVisible({ timeout: 10_000 });
});
