import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 재현/회귀: 완료 처리한 운동(헤머컬)은 '운동 시작'(운동 모드) 큐에 뜨면 안 된다.
// (큐를 '모든 항목'으로 만들고 클라이언트에서 필터하도록 바꾼 뒤 회귀 가드.)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("완료 처리한 헤머컬은 운동 모드 큐에 안 뜬다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 오늘 = 하체 칸에 스쿼트 + 헤머컬 2개(헤머컬은 완료 처리해 둠).
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["lower"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60),
            (${uid}, 0, 'lower', 1, 'hammer-curl', 'dumbbell', 3, 12, 10)`,
    [email],
  );
  // 헤머컬을 오늘 '완료'로 기록.
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, exercise_id, focus)
     values (${uid}, ${today},
             (select id from public.routine_exercises
                where user_id=${uid} and exercise_id='hammer-curl' limit 1),
             'done', 'hammer-curl', 'lower')`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);

  // 첫 항목은 스쿼트(헤머컬은 완료라 제외) — 오버레이 본문으로 스코프.
  const overlay = page.getByTestId("guided-scroll");
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toBeVisible({
    timeout: 8000,
  });

  // 스쿼트 완료 → 큐에 스쿼트만 있으면 오버레이가 닫힌다(헤머컬이 뜨면 버그).
  await page
    .getByRole("button", { name: "운동 완료" })
    .or(page.getByRole("button", { name: "완료하고 종료" }))
    .click();
  await page.waitForTimeout(1000);

  // 헤머컬은 완료라 큐에 없어야 한다 — 오버레이에 뜨면 버그.
  await expect(overlay.getByRole("heading", { name: "해머컬" })).toHaveCount(0);
});
