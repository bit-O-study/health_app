import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 회귀: 메인 화면 메모 버튼으로 입력한 메모가 운동모드(가이드)에도 보여야 한다.
// (예전엔 메모 저장 후 router.refresh 누락으로 서버 큐 queueItems 가 stale → 운동모드에 안 떴다.)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("메인에서 입력한 메모가 운동모드에 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await dbQuery(
    `update public.user_routines set splits=0, variant_id='custom',
        custom_week='[["lower"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
        start_date=${today}, day_index_migrated=true, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // 메인 스쿼트 행의 메모 버튼 → 입력 → 저장
  await page.getByRole("button", { name: "메모 추가" }).first().click();
  await page.getByLabel("메모", { exact: true }).fill("스쿼트 무릎 정렬 주의");
  await page.getByRole("button", { name: "저장" }).click();
  await page.waitForTimeout(1200);

  // 운동 시작 → 운동모드에 메모가 보인다.
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);
  await expect(
    page.getByTestId("guided-scroll").getByText("스쿼트 무릎 정렬 주의"),
  ).toBeVisible({ timeout: 8000 });
});
