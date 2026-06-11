import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 회귀 가드: 가이드(운동 모드)에서 '넘기기'로 휴식 처리한 운동은, 사용자가 수동으로
// 새로고침하지 않아도 홈 화면에 '오늘 휴식'으로 반영돼야 한다.
// (과거 버그: 저장을 백그라운드로 쏘고 곧바로 refresh 해서 일부가 stale 로 남아,
//  새로고침해야만 휴식이 보였다. → 저장 완료를 기다린 뒤 refresh 하도록 수정.)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("가이드에서 전부 넘기면 새로고침 없이 홈에 '오늘 휴식'이 반영된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 오늘 = 하체. 본운동 2개(스쿼트·레그프레스), 워밍업·마무리 없음.
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
            (${uid}, 0, 'lower', 1, 'leg-press', 'machine', 4, 10, 100)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);

  // 모든 항목을 '넘기기'로 휴식 처리 → 마지막에 오버레이가 닫힌다.
  for (let i = 0; i < 10; i++) {
    const next = page.getByRole("button", { name: "넘기기" });
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(400);
  }

  // 오버레이가 닫혀 홈으로 복귀했고, '운동 시작' 버튼이 다시 보인다.
  await expect(page.getByRole("button", { name: "운동 시작" })).toBeVisible({
    timeout: 8000,
  });

  // ★ 수동 새로고침(page.reload) 없이 ★ 두 운동이 '오늘 휴식'으로 반영돼야 한다.
  await expect(page.getByText("오늘 휴식", { exact: true })).toHaveCount(2, {
    timeout: 8000,
  });
});
