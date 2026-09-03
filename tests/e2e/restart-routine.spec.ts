import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// "오늘부터 다시 시작하기": 처음(설정)한 루틴으로 복귀해야 한다.
//  - 현재 일차 유지 + '오늘만 변경'(daily_plan) 제거
//  - '다가오는 7일' 드래그로 바뀐 루틴도 기준(설정) 루틴으로 복원

const today = `(now() at time zone 'Asia/Seoul')::date`;

test("오늘만 변경/휴식을 지우고 현재 일차는 유지한다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  await dbQuery(
    `update public.user_routines
        set splits=3, variant_id='cbl-3', custom_week=null,
            baseline_routine=jsonb_build_object('splits',3,'variant_id','cbl-3','custom_week',null),
            start_date=${today}, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await seedRecommendedExercises(page);

  // 임시 변경: 기준일 -2(오늘=등) + 오늘만 변경(팔)
  await dbQuery(
    `update public.user_routines set start_date=(${today} - 2) where user_id=${uid}`,
    [email],
  );
  await dbQuery(
    `insert into public.daily_plan
       (user_id, for_date, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, ${today}, 'arm', 0, 'biceps-curl', 'barbell', 3, 10, 15)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await expect(page.getByText("오늘만 변경됨")).toBeVisible();

  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘부터 다시 시작하기" }).click();
  await page.waitForTimeout(1500);

  const row = await dbQuery<{ d: string; t: string; ob: string | null; daily: string }>(
    `select to_char(start_date,'YYYY-MM-DD') as d, to_char(${today} - 2,'YYYY-MM-DD') as t,
            override_block as ob,
            (select count(*)::text from public.daily_plan
               where user_id=${uid} and for_date=${today}) as daily
       from public.user_routines where user_id=${uid}`,
    [email],
  );
  expect(row[0].d).toBe(row[0].t);
  expect(row[0].ob).toBeNull();
  expect(row[0].daily).toBe("0");
  await expect(page.getByText("오늘만 변경됨")).toHaveCount(0);
  await expect(page.getByText("등").first()).toBeVisible();
});

test("'다가오는 7일' 드래그로 루틴을 바꿔도 → 기준(설정) 루틴으로 복귀한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  // 기준(설정) 루틴 = cbl-3. active 도 동일하게 두고 시드(오늘=가슴).
  await dbQuery(
    `update public.user_routines
        set splits=3, variant_id='cbl-3', custom_week=null,
            baseline_routine=jsonb_build_object('splits',3,'variant_id','cbl-3','custom_week',null),
            start_date=${today}, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await seedRecommendedExercises(page);

  // '다가오는 7일' 드래그 시뮬: active 만 custom(매일 팔)로 바꾸고 baseline 은 유지.
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["arm"],["arm"],["arm"],["arm"],["arm"],["arm"],["arm"]]'::jsonb,
            start_date=${today}
      where user_id=${uid}`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  // 드래그된 루틴(팔)이 적용된 상태
  await expect(page.getByText("팔", { exact: true }).first()).toBeVisible();

  // 오늘부터 다시 시작하기 → 기준 루틴(cbl-3)으로 복원
  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘부터 다시 시작하기" }).click();
  await page.waitForTimeout(1500);

  const row = await dbQuery<{ splits: number; variant: string; cw: string | null }>(
    `select splits, variant_id as variant, custom_week::text as cw
       from public.user_routines where user_id=${uid}`,
    [email],
  );
  expect(row[0].splits).toBe(3);
  expect(row[0].variant).toBe("cbl-3");
  expect(row[0].cw).toBeNull();
  // 화면도 기준 루틴 1일차(가슴)로 (오늘 카드)
  await expect(page.getByText("가슴").first()).toBeVisible();
});
