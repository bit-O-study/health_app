import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 회귀(#8): '오늘만 부위 추가'로 부위를 더해도, 방금 완료해 둔 세트(운동 완료)는 풀리면 안 된다.
// 부위 추가는 오늘 루틴을 daily_plan 으로 스냅샷(pin)하며 행 id 를 새로 만드는데, 이때 기존
// 완료기록(exercise_completions)의 exercise_row_id 를 새 daily_plan 행 id 로 옮겨(re-key)
// 오늘 화면에서 완료가 그대로 유지돼야 한다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function dismissNudge(page: Page) {
  // 나타날 수 있는 넛지들(알림 권한·리마인더 등)을 모두 닫는다.
  for (const label of ["나중에", "다시는 안 보기", "닫기"]) {
    const btn = page.getByRole("button", { name: label });
    if (await btn.count()) await btn.first().click().catch(() => {});
    await page.waitForTimeout(150);
  }
}

test("오늘만 부위 추가해도 방금 완료한 운동은 완료로 유지(#8)", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 오늘 = 가슴만인 루틴. 영구 루틴엔 벤치프레스 1개.
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null,
            last_deferred_date=null, deferred_target=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.daily_plan where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 0, 'chest', 0, 'bench-press', 'barbell', 4, 8, 60),
       (${uid}, 0, 'chest', 1, 'incline-press', 'barbell', 3, 10, 40)`,
    [email],
  );

  // 방금 벤치프레스를 완료했다고 가정 — 완료기록은 (루틴) 행 id 를 가리킨다.
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, focus, exercise_id, sets, reps, weight_kg)
     select user_id, ${today}, id, 'done', focus, exercise_id, sets, reps, weight_kg
       from public.routine_exercises where user_id=${uid} and exercise_id='bench-press'`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await dismissNudge(page);

  // 이 시점엔 벤치프레스가 완료로 보여야 한다.
  const benchRowBefore = page.locator("li").filter({ hasText: "벤치프레스" });
  await expect(
    benchRowBefore.getByText("완료", { exact: true }).first(),
  ).toBeVisible();

  // 부위 배지(가슴) → 오늘만 운동 바꾸기 → 어깨 → 오늘만 부위 추가 (pin 발생)
  await dismissNudge(page);
  await page.getByRole("button", { name: "가슴", exact: true }).first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();
  await expect(
    page.getByRole("heading", { name: "오늘만 운동 바꾸기" }),
  ).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: "어깨", exact: true }).click();
  await page.getByRole("button", { name: "오늘만 부위 추가" }).click();
  await expect(page).toHaveURL(/\/plan\/today.*add=1/, { timeout: 30000 });
  await page.waitForTimeout(1200);

  // pin 으로 벤치프레스 완료기록이 daily_plan 행 id 로 옮겨졌는지 (풀리지 않음).
  const stillDone = await dbQuery<{ n: string }>(
    `select count(*)::text n from public.exercise_completions
      where user_id=${uid} and for_date=${today} and status='done'
        and exercise_id='bench-press'`,
    [email],
  );
  expect(Number(stillDone[0].n)).toBe(1);
  const rekeyed = await dbQuery<{ n: string }>(
    `select count(*)::text n from public.exercise_completions ec
      where ec.user_id=${uid} and ec.for_date=${today} and ec.exercise_id='bench-press'
        and ec.exercise_row_id in
          (select id from public.daily_plan where user_id=${uid} and for_date=${today})`,
    [email],
  );
  expect(Number(rekeyed[0].n)).toBe(1);

  // /routine 으로 돌아가도 벤치프레스는 여전히 완료.
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const benchRowAfter = page.locator("li").filter({ hasText: "벤치프레스" });
  await expect(
    benchRowAfter.getByText("완료", { exact: true }).first(),
  ).toBeVisible();
});
