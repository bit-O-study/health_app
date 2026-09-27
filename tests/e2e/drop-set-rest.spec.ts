import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 드롭세트는 **쉬지 않고** 이어 간다.
 *
 * 운동모드는 세트를 끝낼 때마다 휴식 타이머를 돌리는데, 드롭세트에서 90초를 쉬면
 * 그냥 가벼운 세트를 하나 더 한 것이 된다(슈퍼세트를 쉬지 않고 넘기는 것과 같은 이유).
 * 세트별 무게가 내려가고 횟수가 그대로면 휴식을 건너뛴다.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function seedOneExercise(email: string, setDetails: string) {
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
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg, set_details)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 3, 10, 100, $2::jsonb)`,
    [email, setDetails],
  );
}

test("드롭세트는 세트를 끝내도 휴식 타이머가 뜨지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  // 100 → 80 → 65, 횟수는 그대로 = 드롭세트.
  await seedOneExercise(
    email,
    JSON.stringify([
      { weightKg: 100, reps: 10 },
      { weightKg: 80, reps: 10 },
      { weightKg: 65, reps: 10 },
    ]),
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);

  await page.getByRole("button", { name: /세트 완료/ }).first().click();
  await page.waitForTimeout(1500);

  // 휴식 알약이 뜨면 안 된다 — 무게만 내리고 바로 다음 세트다.
  // (⚠ "휴식" 으로 찾으면 시작 화면의 **휴식 시간 설정 프리셋 5개**가 잡힌다 —
  //  타이머가 실제로 떴는지는 '휴식 건너뛰기' 와 카운트다운으로 본다.)
  await expect(
    page.getByRole("button", { name: "휴식 건너뛰기" }),
  ).toHaveCount(0);
  await expect(page.getByText("휴식 중")).toHaveCount(0);
  // 세트 진행은 올라간다.
  await expect(page.getByText("세트 2/3")).toBeVisible({ timeout: 10_000 });
});

test("역피라미드(무게 ↓ 횟수 ↑)는 그대로 쉰다 — 드롭세트와 다르다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  await seedOneExercise(
    email,
    JSON.stringify([
      { weightKg: 100, reps: 6 },
      { weightKg: 90, reps: 8 },
      { weightKg: 80, reps: 10 },
    ]),
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);

  await page.getByRole("button", { name: /세트 완료/ }).first().click();
  // 휴식 타이머가 뜬다.
  await expect(page.getByText("휴식 중")).toBeVisible({ timeout: 10_000 });
});
