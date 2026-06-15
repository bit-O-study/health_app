import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 회귀 가드: '오늘 할 운동' 편집에서 세트수를 4→6 으로 올리면 운동모드(가이드 오버레이)
// 에도 반영돼야 한다. (예전엔 인라인 편집 후 router.refresh() 누락으로 큐가 stale 했다.)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("세트수 변경(4→6)이 운동모드에 반영된다", async ({ page }) => {
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
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 편집하기 → 수정(연필) → 세트 6 → 저장
  await page.getByRole("button", { name: "편집하기" }).click();
  await page.getByRole("button", { name: "수정" }).first().click();
  const setsInput = page.getByLabel("세트", { exact: true });
  await setsInput.fill("6");
  await page.getByRole("button", { name: "저장" }).click();
  await page.waitForTimeout(1000);

  // 편집 종료 후 운동 시작
  await page.getByRole("button", { name: "취소" }).first().click();
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);

  // 운동모드 세트 진행 라벨이 6세트 기준으로 떠야 한다(4 가 아니라 6).
  await expect(page.getByText("세트 1/6")).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("세트 1/4")).toHaveCount(0);
});
