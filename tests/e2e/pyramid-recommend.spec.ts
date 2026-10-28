import { swipeGuided } from "./helpers/guided-navigation";
import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 추천이 세트 방식을 골라 준다(2026-10-14) — 큰 복합 운동 · 중급 이상은 피라미드로 담긴다.
// 같은 루틴의 지난 기록이면 처방 기본 무게가 아니라 내 지난번 무게로 피라미드를 다시 만든다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function seedChestDay(email: string, experience: string) {
  await dbQuery(`update public.profiles set experience=$2 where user_id=${uid}`, [email, experience]);
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
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
     values (${uid}, 0, 'chest', 0, 'pec-deck', 'machine', 3, 12, 20)`,
    [email],
  );
}

async function addDeadliftToday(page: import("@playwright/test").Page) {
  await page.goto("/routine", { waitUntil: "networkidle" });
  const later = page.getByRole("button", { name: /나중에/ });
  if (await later.count()) await later.first().click().catch(() => {});
  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();
  const picker = page.getByTestId("today-add-picker");
  await picker.getByLabel("더할 운동 찾기").fill("데드리프트");
  await picker.getByRole("button", { name: "찾기" }).click();
  await page.getByTestId("today-add-deadlift").click();
  await picker.getByRole("button", { name: "1개 오늘만 담기" }).click();
}

const planned = (email: string) =>
  dbQuery<{ sets: number; set_details: { weightKg: number; reps: number }[] | null }>(
    `select sets, set_details from public.daily_plan where user_id=${uid} and for_date=${today} and exercise_id='deadlift'`,
    [email],
  );

test("중급 · 데드리프트는 피라미드로 담기고, 운동모드는 내 지난번 무게로 만든 피라미드를 보여 준다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(180_000);
  const email = await signUpAndOnboard(page);
  await seedChestDay(email, "intermediate");
  // 오늘 담은 뒤와 같은 등+가슴 루틴에서 지난주 100kg × 6회 × 4세트를 했다.
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus, sets, reps, weight_kg)
     values (${uid}, ${today} - 7, gen_random_uuid(), 'done', 'deadlift', 'barbell', 'back', 4, 6, 100),
            (${uid}, ${today} - 7, gen_random_uuid(), 'done', 'pec-deck', 'machine', 'chest', 3, 12, 20)`,
    [email],
  );

  await addDeadliftToday(page);
  await expect.poll(async () => (await planned(email)).length, { timeout: 20_000 }).toBe(1);
  const row = (await planned(email))[0];
  // 올라가는 두 세트 뒤 본세트 — 무게는 오르고 횟수는 준다.
  expect(row.set_details).not.toBeNull();
  const sd = row.set_details!;
  expect(sd.length).toBe(row.sets);
  expect(sd.length).toBeGreaterThanOrEqual(3);
  expect(sd[0].weightKg).toBeLessThan(sd[sd.length - 1].weightKg);
  expect(sd[0].reps).toBeGreaterThan(sd[sd.length - 1].reps);

  // 운동모드 — 처방 기본 무게가 아니라 지난번 100kg 을 본세트로 한 피라미드(85 → 92.5 → 100 → 100).
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  const plan = page.getByTestId("set-plan");
  // 목록에도 같은 이름이 있으니 운동모드 안에서 찾는다. 첫 운동이 아니면 다음으로 넘긴다.
  const mode = page.getByTestId("guided-scroll");
  const title = mode.getByRole("heading", { name: "데드리프트" });
  for (let i = 0; i < 4 && !(await title.isVisible().catch(() => false)); i++) {
    await swipeGuided(page);
    await page.waitForTimeout(600);
  }
  await expect(title).toBeVisible({ timeout: 15_000 });
  await expect(plan.locator("li")).toHaveText(["85kg × 10회", "92.5kg × 8회", "100kg × 6회", "100kg × 6회"]);
});

test("초급은 같은 무게·같은 횟수 그대로 담긴다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  const email = await signUpAndOnboard(page);
  await seedChestDay(email, "beginner");
  await addDeadliftToday(page);
  await expect.poll(async () => (await planned(email)).length, { timeout: 20_000 }).toBe(1);
  expect((await planned(email))[0].set_details).toBeNull();
});
