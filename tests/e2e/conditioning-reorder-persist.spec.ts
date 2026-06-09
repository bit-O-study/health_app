import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 사용자 시나리오: 마무리(쿨다운)를 완료한 뒤 하단 '다가오는 7일' 드래그로 루틴을
// 바꾸면 오늘 보이는 부위(focus)가 달라진다. 부위마다 마무리 종목이 달라도(런닝→
// 스트레칭) "오늘 마무리 한번 하면 종일 완료" 규칙으로 완료가 유지돼야 한다.

test("루틴변경으로 오늘 마무리 종목이 달라져도(런닝→스트레칭) 완료 유지", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  // 1일차=가슴(마무리=런닝), 2일차=등(마무리=스트레칭). 마이그레이션 스킵.
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest"],["back"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            day_index_migrated=true, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(
    `delete from public.routine_conditioning where user_id=${uid}`,
    [email],
  );
  // 가슴=런닝, 등=차일드포즈(종목 자체가 다름)
  await dbQuery(
    `insert into public.routine_conditioning
       (user_id, focus, kind, position, item_id, duration_min)
     values
       (${uid}, 'chest', 'cooldown', 0, 'running', 5),
       (${uid}, 'back', 'cooldown', 0, 'child-pose', null)`,
    [email],
  );

  // 오늘(가슴) 마무리 '런닝' 완료.
  await dbQuery(
    `insert into public.conditioning_completions
       (user_id, for_date, kind, item_id, source_row_id, status)
     select user_id, (now() at time zone 'Asia/Seoul')::date, kind, item_id, id, 'done'
       from public.routine_conditioning
      where user_id=${uid} and kind='cooldown' and focus='chest'`,
    [email],
  );

  // 하단 '다가오는 7일' 드래그 모사: 등을 1일차로 → 오늘 부위가 등으로 바뀜.
  await dbQuery(
    `update public.user_routines
        set custom_week='[["back"],["chest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=(now() at time zone 'Asia/Seoul')::date
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(
    `delete from public.daily_conditioning where user_id=${uid}`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 오늘 부위가 등으로 바뀌어 마무리 종목이 차일드포즈(런닝과 다른 종목)지만,
  // 오늘 이미 마무리를 한 번 완료했으므로 (종류) 키로 완료가 유지돼야 한다.
  const coolUl = page
    .locator("ul.space-y-2")
    .filter({ hasText: "차일드 포즈" });
  await expect(coolUl.getByText("완료", { exact: true }).first()).toBeVisible();
});
