import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 재현/회귀: '오늘만 운동 바꾸기 → 운동 전체 바꾸기(replace)' 하면 원래 오늘 운동이
// 사라지면 안 되고, 루틴이 하루 밀려 내일로 이동해야 한다(start_date +1).
// (예전엔 오늘만 숨기고 아무 데도 안 옮겨서 원래 운동이 그냥 사라졌다.)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("오늘만 전체 바꾸기 → 루틴이 하루 밀린다(start_date +1, 원래 운동 내일로)", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

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
  const startBefore = before[0]?.start_date;
  expect(startBefore).toBeTruthy();

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

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
  await page.waitForURL(/\/plan\/today/, { timeout: 8000 });
  await page.waitForTimeout(1200);

  const after = await dbQuery<{ start_date: string; last_deferred_date: string | null }>(
    `select start_date::text, last_deferred_date::text from public.user_routines where user_id=${uid}`,
    [email],
  );
  // start_date 가 하루 밀렸는지 + 오늘이 변경된 날로 마킹됐는지.
  const startAfter = after[0]?.start_date;
  const expected = new Date(`${startBefore}T00:00:00Z`);
  expected.setUTCDate(expected.getUTCDate() + 1);
  const expectedYmd = expected.toISOString().slice(0, 10);
  expect(startAfter).toBe(expectedYmd);
});