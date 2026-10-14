import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 운동모드 — 세트마다 다른 운동(피라미드)은 세트마다 그 값이 보이고, 그대로 기록된다(2026-10-14).
// 예전엔 칸 하나를 모든 세트에 써서 "피라미드인데 10개 고정"으로 보였고 첫 세트 값으로만 기록됐다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

const PYRAMID = [
  { weightKg: 60, reps: 12 },
  { weightKg: 70, reps: 10 },
  { weightKg: 80, reps: 8 },
];

async function seedPyramidSquat(email: string) {
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
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 3, 12, 60, $2::jsonb)`,
    [email, JSON.stringify(PYRAMID)],
  );
}

test("피라미드는 세트마다 무게·횟수가 바뀌어 보이고, 한 세트만 고쳐도 세트별로 기록된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(180_000);
  const email = await signUpAndOnboard(page);
  await seedPyramidSquat(email);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();

  // 1세트 — 60kg × 12회. 칸(무게·횟수)도 그 세트의 값이다.
  const plan = page.getByTestId("set-plan");
  await expect(plan).toBeVisible({ timeout: 15_000 });
  await expect(plan.locator("li")).toHaveCount(3);
  await expect(page.getByTestId("set-plan-now")).toHaveText("60kg × 12회");
  const weight = page.getByRole("slider", { name: "무게" });
  const reps = page.getByRole("slider", { name: "횟수" });
  await expect(weight).toHaveAttribute("aria-valuenow", "60");
  await expect(reps).toHaveAttribute("aria-valuenow", "12");

  // 2세트 — 70kg × 10회(10회 고정이 아니라 세트마다 다르다).
  await page.getByRole("button", { name: "세트 완료", exact: true }).click();
  await page.getByRole("button", { name: /휴식 끝내기/ }).click();
  await expect(page.getByTestId("set-plan-now")).toHaveText("70kg × 10회");
  await expect(weight).toHaveAttribute("aria-valuenow", "70");
  await expect(reps).toHaveAttribute("aria-valuenow", "10");

  // 2세트의 횟수만 한 번 올린다 — 다른 세트의 계획은 그대로.
  await page.getByRole("button", { name: "횟수 늘리기" }).click();
  await expect(page.getByTestId("set-plan-now")).toHaveText("70kg × 11회");

  // 3세트 — 80kg × 8회.
  await page.getByRole("button", { name: "세트 완료", exact: true }).click();
  await page.getByRole("button", { name: /휴식 끝내기/ }).click();
  await expect(page.getByTestId("set-plan-now")).toHaveText("80kg × 8회");
  await expect(reps).toHaveAttribute("aria-valuenow", "8");

  // 마지막 세트까지 끝내면 운동이 완료되고, 세트별로 기록된다.
  await page.getByRole("button", { name: "마지막 세트 완료", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await dbQuery<{ set_details: unknown }>(
            `select set_details from public.exercise_completions where user_id=${uid} and exercise_id='squat' and status='done'`,
            [email],
          )
        )[0]?.set_details ?? null,
      { timeout: 20_000 },
    )
    .toEqual([
      { weightKg: 60, reps: 12 },
      { weightKg: 70, reps: 11 },
      { weightKg: 80, reps: 8 },
    ]);
});
