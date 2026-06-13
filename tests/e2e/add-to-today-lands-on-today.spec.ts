import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 재현: '오늘의 운동 → 편집하기 → 추가'로 등(back)에 데드리프트를 추가하면, 오늘
// (해당 일자)에 떠야 한다. (사용자 제보: 오늘은 안 뜨고 다음 주 같은 요일에만 뜸.)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("오늘 등에 데드리프트를 추가하면 오늘 목록에 바로 뜬다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 오늘 = day_index 2 = 등(back). (등은 day 2 에만.) 시작일을 2일 전으로.
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
  // 등 칸이 보이도록 기존 등 운동 1개(풀업)를 day 2 에 심는다.
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 2, 'back', 0, 'pull-up', 'bodyweight', 4, 8, 0)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 편집 모드 진입 후 운동 추가.
  await page.getByRole("button", { name: "편집하기" }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "오늘 루틴에 운동 추가" }).click();
  await page.waitForTimeout(300);
  await page.getByLabel("운동").selectOption({ label: "데드리프트" });
  await page.getByRole("button", { name: "추가", exact: true }).click();
  await page.waitForTimeout(1500);

  // DB 확인 — 데드리프트가 어디에 들어갔는지(진단용).
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

  // ★ 핵심: 오늘(등) 목록에 데드리프트가 떠야 한다.
  await expect(page.getByText("데드리프트").first()).toBeVisible({ timeout: 8000 });
});
