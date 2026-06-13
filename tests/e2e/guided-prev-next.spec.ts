import { type Page, expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 운동 모드에서 좌우 화살표(‹ ›) 탭 또는 드래그(스와이프)로 운동 사이를 이동.
// ← 다음 / → 이전. 완료·스킵 없이 이동만 한다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function seedTwo(email: string) {
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
}

async function startGuided(page: Page, email: string) {
  await seedTwo(email);
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);
}

test("화살표로 다음/이전 이동하고, 이동만으로는 완료/스킵이 안 된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await startGuided(page, email);

  const overlay = page.getByTestId("guided-scroll");
  const prev = page.getByRole("button", { name: "이전 운동" });
  const next = page.getByRole("button", { name: "다음 운동" });

  // 첫 운동 = 스쿼트. '이전' 화살표는 비활성(첫 운동).
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toBeVisible({
    timeout: 8000,
  });
  await expect(prev).toBeDisabled();

  // 다음(›) → 레그프레스. 마지막이라 '다음' 비활성.
  await next.click();
  await expect(overlay.getByRole("heading", { name: "레그프레스" })).toBeVisible();
  await expect(next).toBeDisabled();

  // 이전(‹) → 다시 스쿼트.
  await prev.click();
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toBeVisible();

  // 휴식 타이머도 안 뜨고, 완료/스킵 기록도 없어야 한다.
  await expect(page.getByText("휴식 중")).toHaveCount(0);
  const completions = await dbQuery<{ n: string }>(
    `select count(*)::text as n from public.exercise_completions where user_id=${uid}`,
    [email],
  );
  expect(completions[0]?.n).toBe("0");
});

test("이동 후 완료는 올바른 운동에 기록되고 미방문 운동은 다시 뜬다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await startGuided(page, email);

  const overlay = page.getByTestId("guided-scroll");
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toBeVisible({
    timeout: 8000,
  });

  // 다음 → 레그프레스, 거기서 완료. 완료는 레그프레스에만.
  await page.getByRole("button", { name: "다음 운동" }).click();
  await expect(overlay.getByRole("heading", { name: "레그프레스" })).toBeVisible();
  await page
    .getByRole("button", { name: "운동 완료" })
    .or(page.getByRole("button", { name: "완료하고 종료" }))
    .click();
  await page.waitForTimeout(1500);

  const done = await dbQuery<{ exercise_id: string; status: string }>(
    `select exercise_id, status from public.exercise_completions where user_id=${uid}`,
    [email],
  );
  expect(done.length).toBe(1);
  expect(done[0]?.exercise_id).toBe("leg-press");
  expect(done[0]?.status).toBe("done");

  // 다시 시작 → 미방문 스쿼트는 뜨고, 완료한 레그프레스는 안 뜬다.
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

// 참고: 좌우 드래그(스와이프) 이동도 지원하지만(터치), Playwright 마우스-드래그가
// 합성 pointer 이벤트를 일관되게 보내지 못해 회귀 가드는 화살표(탭)로 둔다.
