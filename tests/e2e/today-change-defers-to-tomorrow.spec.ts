import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 오늘만 변경은 내일 이후 루틴 일정과 운동 구성을 보존한다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("오늘만 전체 바꾸기 → 영구 루틴 시작일과 구성이 그대로 유지된다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest"],["back"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null,
            last_deferred_date=null, deferred_target=null
      where user_id=${uid}`,
    [email],
  );

  const before = await dbQuery<{ start_date: string }>(
    `select start_date::text from public.user_routines where user_id=${uid}`,
    [email],
  );
  const [permanentBefore] = await dbQuery<{ custom_week: unknown }>(`select custom_week from public.user_routines where user_id=${uid}`, [email]);
  const exercisesBefore = await dbQuery(`select * from public.routine_exercises where user_id=${uid} order by id`, [email]);
  const startBefore = before[0]?.start_date;
  expect(startBefore).toBeTruthy();

  await page.goto("/routine", { waitUntil: "networkidle" });
  await expect(page.locator(".app-splash")).toHaveCount(0);

  // '오늘만 운동 바꾸기' 열고, 부위 선택 후 '운동 전체 바꾸기'
  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).click();
  await page.waitForTimeout(300);
  // 부위 칩은 **시트 안에서** 고른다(바깥 부위 배지와 이름이 겹쳐 잘못 눌리던 문제).
  await expect(
    page.getByRole("heading", { name: "오늘만 운동 바꾸기" }),
  ).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: "하체 전체", exact: true }).click();
  await page.getByRole("button", { name: /운동 전체 바꾸기|전체 바꾸기/ }).click();
  // replace 는 /plan/today 로 이동 → defer 가 실행됨.
  await page.waitForURL(/\/plan\/today/, { timeout: 30000, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  const after = await dbQuery<{ start_date: string; last_deferred_date: string | null }>(
    `select start_date::text, last_deferred_date::text from public.user_routines where user_id=${uid}`,
    [email],
  );
  const [permanentAfter] = await dbQuery<{ custom_week: unknown }>(`select custom_week from public.user_routines where user_id=${uid}`, [email]);
  expect(permanentAfter).toEqual(permanentBefore);
  expect(await dbQuery(`select * from public.routine_exercises where user_id=${uid} order by id`, [email])).toEqual(exercisesBefore);
  expect(after[0]?.start_date).toBe(startBefore);
  expect(after[0]?.last_deferred_date).toBe(startBefore);
});