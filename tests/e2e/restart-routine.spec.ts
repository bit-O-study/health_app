import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// "오늘부터 다시 시작하기": 처음 설정한 루틴으로 복귀해야 한다.
//  - 기준일(start_date)을 오늘로 리셋 → 오늘이 1일차
//  - 그동안의 '오늘만 변경'(daily_plan) 오버라이드 제거 → 기본 루틴이 그대로 보임

test("오늘부터 다시 시작하기 → 기준일 리셋 + 오늘만 변경 제거 = 처음 루틴 복귀", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  // cbl-3 (가슴/휴식/등/휴식/하체/휴식/휴식). 기준일=오늘으로 두고 먼저 시드(오늘=가슴).
  await dbQuery(
    `update public.user_routines
        set splits=3, variant_id='cbl-3', custom_week=null,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await seedRecommendedExercises(page);

  // 임시 변경을 만든다:
  //  - 기준일을 이틀 전으로 → 오늘=3일차=등(운동일)
  //  - '오늘만 변경'(daily_plan)으로 오늘 부위를 팔로 덮어쓴다
  await dbQuery(
    `update public.user_routines
        set start_date=((now() at time zone 'Asia/Seoul')::date - 2)
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(
    `insert into public.daily_plan
       (user_id, for_date, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, (now() at time zone 'Asia/Seoul')::date, 'arm', 0,
             'biceps-curl', 'barbell', 3, 10, 15)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  // 오늘만 변경(팔)이 적용된 상태여야 한다
  await expect(page.getByText("오늘만 변경됨")).toBeVisible();
  await expect(page.getByText("팔", { exact: true }).first()).toBeVisible();

  // 오늘부터 다시 시작하기
  await page.getByRole("button", { name: "오늘부터 다시 시작하기" }).click();
  await page.waitForTimeout(1500);

  // DB: 기준일=오늘, 오늘 daily_plan 0개, override 비움
  const row = await dbQuery<{
    d: string;
    today: string;
    ob: string | null;
    daily: string;
  }>(
    `select to_char(start_date,'YYYY-MM-DD') as d,
            to_char((now() at time zone 'Asia/Seoul')::date,'YYYY-MM-DD') as today,
            override_block as ob,
            (select count(*)::text from public.daily_plan
               where user_id=${uid}
                 and for_date=(now() at time zone 'Asia/Seoul')::date) as daily
       from public.user_routines where user_id=${uid}`,
    [email],
  );
  expect(row[0].d).toBe(row[0].today); // 기준일 = 오늘
  expect(row[0].ob).toBeNull(); // override 제거
  expect(row[0].daily).toBe("0"); // 오늘만 변경 제거

  // 화면: 1일차(가슴)로 복귀, '오늘만 변경됨' 배지 사라짐
  await expect(page.getByText("오늘만 변경됨")).toHaveCount(0);
  await expect(page.getByText("가슴").first()).toBeVisible();
});
