import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 무게·횟수 고정 설정:
//  - 끔(기본): 메인·편집에 무게/횟수 숨기고 운동모드에서 스크러버로 설정, 완료 시 기록.
//  - 켬: 미리 정한 무게/횟수를 메인에 표시, 운동모드 스크러버는 안 뜬다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function seedSquat(email: string, lock: boolean) {
  await dbQuery(
    `update public.profiles set lock_weight_reps=${lock} where user_id=${uid}`,
    [email],
  );
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
  await dbQuery(`delete from public.exercise_completions where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60)`,
    [email],
  );
}

test("고정 끔: 메인에 무게/횟수 숨기고 운동모드 스크러버로 설정·기록", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedSquat(email, false);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 메인 스쿼트 행: 무게·횟수는 물론 세트수도 안 보이고(운동모드에서 설정), 칼로리만.
  const squatRow = page.locator("li").filter({ hasText: "스쿼트" }).first();
  await expect(squatRow).toBeVisible({ timeout: 8000 });
  await expect(squatRow.getByText(/kcal/)).toBeVisible();
  await expect(squatRow.getByText(/세트/)).toHaveCount(0);
  await expect(squatRow.getByText(/60kg/)).toHaveCount(0);
  await expect(squatRow.getByText(/8회/)).toHaveCount(0);

  // 운동 시작 → 운동모드. 무게/횟수/세트 스크러버 + 운동법 버튼이 뜬다.
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);
  const overlay = page.getByTestId("guided-scroll");
  await expect(overlay.getByText("무게", { exact: true }).first()).toBeVisible({ timeout: 8000 });
  await expect(overlay.getByText("횟수", { exact: true }).first()).toBeVisible();
  await expect(overlay.getByText("세트", { exact: true }).first()).toBeVisible();

  // 완료 → 운동모드에서 정한 값(계획 기본 4세트×8회×60kg)이 완료 기록에 남는다.
  await page
    .getByRole("button", { name: "완료하고 종료" })
    .or(page.getByRole("button", { name: "운동 완료" }))
    .first()
    .click();
  await page.waitForTimeout(1500);

  const done = await dbQuery<{ exercise_id: string; sets: string; reps: string; weight_kg: string }>(
    `select exercise_id, sets::text, reps::text, weight_kg::text
       from public.exercise_completions where user_id=${uid} and status='done'`,
    [email],
  );
  expect(done.length).toBe(1);
  expect(done[0].exercise_id).toBe("squat");
  expect(Number(done[0].sets)).toBe(4);
  expect(Number(done[0].weight_kg)).toBe(60);
});

test("고정 끔: 운동모드 무게 더블클릭해 직접 입력한 값이 기록된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedSquat(email, false);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);

  const overlay = page.getByTestId("guided-scroll");
  // 무게 값(슬라이더)을 더블클릭 → 직접 입력칸이 뜬다. 80 입력 후 Enter.
  await overlay.getByRole("slider", { name: "무게" }).dblclick();
  const input = overlay.getByRole("spinbutton", { name: "무게 직접 입력" });
  await expect(input).toBeVisible({ timeout: 4000 });
  await input.fill("80");
  await input.press("Enter");
  await expect(overlay.getByText("80", { exact: true })).toBeVisible();

  await page
    .getByRole("button", { name: "완료하고 종료" })
    .or(page.getByRole("button", { name: "운동 완료" }))
    .first()
    .click();
  await page.waitForTimeout(1500);

  const done = await dbQuery<{ weight_kg: string }>(
    `select weight_kg::text from public.exercise_completions
       where user_id=${uid} and status='done'`,
    [email],
  );
  expect(done.length).toBe(1);
  expect(Number(done[0].weight_kg)).toBe(80);
});

test("고정 켬: 메인에 무게 표시, 운동모드 스크러버는 안 뜬다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedSquat(email, true);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 메인 스쿼트 행: 무게(60kg)가 보인다.
  const squatRow = page.locator("li").filter({ hasText: "스쿼트" }).first();
  await expect(squatRow.getByText(/60kg/)).toBeVisible({ timeout: 8000 });

  // 운동 시작 → 스크러버(세트 라벨) 안 뜨고, subtitle 에 무게가 보인다.
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);
  const overlay = page.getByTestId("guided-scroll");
  await expect(overlay.getByRole("button", { name: "스쿼트" })).toBeVisible({ timeout: 8000 });
  await expect(overlay.getByText("세트", { exact: true })).toHaveCount(0);
  await expect(overlay.getByText(/60kg/)).toBeVisible();
});