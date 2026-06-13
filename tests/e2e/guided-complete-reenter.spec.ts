import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 재현/회귀: 운동 모드(가이드)에서 운동을 '완료'한 뒤 다시 운동 시작하면, 완료한
// 운동이 큐에 다시 뜨면 안 된다. (가이드 완료가 공유 오버라이드를 갱신 안 해서
// 서버 새로고침 전 재진입 시 다시 뜨던 문제 가드.)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("가이드에서 완료한 운동은 다시 시작해도 큐에 안 뜬다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

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
            (${uid}, 0, 'lower', 1, 'hammer-curl', 'dumbbell', 4, 12, 10)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);

  const overlay = page.getByTestId("guided-scroll");
  // 스쿼트 완료 → 헤머컬로
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toBeVisible({
    timeout: 8000,
  });
  await page.getByRole("button", { name: "운동 완료" }).click();
  await page.waitForTimeout(700);
  // 헤머컬 완료 → 종료
  await expect(overlay.getByRole("heading", { name: "해머컬" })).toBeVisible({
    timeout: 8000,
  });
  await page
    .getByRole("button", { name: "운동 완료" })
    .or(page.getByRole("button", { name: "완료하고 종료" }))
    .click();
  await page.waitForTimeout(1500);

  // 다시 운동 시작 — 둘 다 완료라 뜰 게 없어야 한다(헤머컬이 다시 뜨면 버그).
  const startAgain = page.getByRole("button", { name: "운동 시작" });
  if (await startAgain.count()) {
    await startAgain.click();
    await page.waitForTimeout(1200);
  }
  await expect(overlay.getByRole("heading", { name: "해머컬" })).toHaveCount(0);
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toHaveCount(0);
});
