import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 운동 모드에서 '이전/다음' 버튼으로 완료·스킵 없이 운동 사이를 이동할 수 있어야 한다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("운동 모드 이전/다음 버튼으로 운동 사이를 이동한다", async ({ page }) => {
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
            (${uid}, 0, 'lower', 1, 'leg-press', 'machine', 4, 10, 100)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);

  const overlay = page.getByTestId("guided-scroll");
  const prev = page.getByRole("button", { name: "이전" });
  const next = page.getByRole("button", { name: "다음" });

  // 첫 운동 = 스쿼트. '이전'은 비활성.
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toBeVisible({
    timeout: 8000,
  });
  await expect(prev).toBeDisabled();

  // 다음 → 레그프레스. '다음'은 마지막이라 비활성.
  await next.click();
  await page.waitForTimeout(400);
  await expect(overlay.getByRole("heading", { name: "레그프레스" })).toBeVisible();
  await expect(next).toBeDisabled();

  // 이전 → 다시 스쿼트(완료/스킵 안 됨).
  await prev.click();
  await page.waitForTimeout(400);
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toBeVisible();

  // 완료/스킵 기록이 없어야 한다(이동만 했으므로).
  const completions = await dbQuery<{ n: string }>(
    `select count(*)::text as n from public.exercise_completions where user_id=${uid}`,
    [email],
  );
  expect(completions[0]?.n).toBe("0");
});

test("이전/다음 이동은 휴식 타이머를 띄우지 않고, 이동 후 완료는 올바른 운동에 기록된다", async ({
  page,
}) => {
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
            (${uid}, 0, 'lower', 1, 'leg-press', 'machine', 4, 10, 100)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);

  const overlay = page.getByTestId("guided-scroll");
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toBeVisible({
    timeout: 8000,
  });

  // 다음 → 레그프레스. 이동만으로 휴식 타이머('휴식 중')가 뜨면 안 된다.
  await page.getByRole("button", { name: "다음" }).click();
  await page.waitForTimeout(500);
  await expect(overlay.getByRole("heading", { name: "레그프레스" })).toBeVisible();
  await expect(page.getByText("휴식 중")).toHaveCount(0);

  // 레그프레스(마지막)에서 완료 → 종료. 완료는 '레그프레스'에만 기록돼야 한다.
  await page
    .getByRole("button", { name: "운동 완료" })
    .or(page.getByRole("button", { name: "완료하고 종료" }))
    .click();
  await page.waitForTimeout(1500);

  const done = await dbQuery<{ exercise_id: string; status: string }>(
    `select exercise_id, status from public.exercise_completions where user_id=${uid}`,
    [email],
  );
  // 레그프레스 done 1건, 스쿼트는 없음.
  expect(done.length).toBe(1);
  expect(done[0]?.exercise_id).toBe("leg-press");
  expect(done[0]?.status).toBe("done");

  // 다시 운동 시작 → 미완료(미방문) 스쿼트는 다시 뜨고, 완료한 레그프레스는 안 뜬다.
  const startAgain = page.getByRole("button", { name: "운동 시작" });
  if (await startAgain.count()) {
    await startAgain.click();
    await page.waitForTimeout(1200);
  }
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toBeVisible({
    timeout: 8000,
  });
  await expect(overlay.getByRole("heading", { name: "레그프레스" })).toHaveCount(0);
});
