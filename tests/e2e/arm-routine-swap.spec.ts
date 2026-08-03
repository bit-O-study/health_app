import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

const initialWeek = [
  ["back", "biceps"],
  ["shoulder", "triceps"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
];

async function seedArmRoutine(email: string) {
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom', custom_week=$2::jsonb,
            day_index_migrated=true,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            rest_date=null,
            override_date=(now() at time zone 'Asia/Seoul')::date,
            override_block='lower',
            today_added_date=(now() at time zone 'Asia/Seoul')::date,
            today_added_blocks='core-upper-abs'
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email, JSON.stringify(initialWeek)],
  );

  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment,
        sets, reps, weight_kg, set_details, memo)
     values
       (${uid}, 0, 'back', 0, 'lat-pulldown', 'cable', 3, 10, 35, null, '등 유지'),
       (${uid}, 0, 'arm', 4, 'biceps-curl', 'dumbbell', 4, 8, 12,
        '[{"weightKg":12,"reps":8}]'::jsonb, '이두 메모'),
       (${uid}, 1, 'shoulder', 0, 'ohp', 'barbell', 3, 10, 16, null, '어깨 유지'),
       (${uid}, 1, 'arm', 7, 'triceps-pushdown', 'cable', 5, 12, 25,
        '[{"weightKg":25,"reps":12}]'::jsonb, '삼두 메모')`,
    [email],
  );
}

test("운동 등록에서 두 일차의 팔 루틴을 교환한다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await seedArmRoutine(email);

  await page.goto("/plan", { waitUntil: "networkidle" });
  const day0 = page.locator('[data-plan-day-index="0"]');
  const day1 = page.locator('[data-plan-day-index="1"]');
  await expect(day0).toContainText("등 · 팔");
  await expect(day1).toContainText("어깨 · 팔");
  await expect(day0.getByText("이두", { exact: true })).toHaveCount(0);
  await expect(day1.getByText("삼두", { exact: true })).toHaveCount(0);

  await day0.getByTestId("arm-swap-button-0").click();
  await day0.getByRole("button", { name: "2일차 · 어깨 + 팔" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "1일차 팔 루틴과 2일차 팔 루틴을 교환할까요?",
  );
  await page.getByRole("button", { name: "교환하기" }).click();
  await page.waitForLoadState("networkidle");
});
