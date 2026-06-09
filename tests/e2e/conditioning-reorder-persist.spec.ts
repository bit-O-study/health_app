import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 사용자 시나리오: 마무리(쿨다운)를 완료한 뒤 하단 '다가오는 7일' 드래그로 루틴을
// 바꾸면 오늘 보이는 부위(focus)가 달라진다. 그래도 같은 마무리 종목이면 완료가
// 유지돼야 한다. (행 id 가 부위마다 달라도 (종류:항목) 키로 매칭)

test("루틴변경으로 오늘 부위가 바뀌어도 같은 마무리 종목이면 완료 유지", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  // 1일차=가슴, 2일차=하체. 둘 다 마무리는 '런닝'(running). 마이그레이션 스킵.
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest"],["lower"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            day_index_migrated=true, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(
    `delete from public.routine_conditioning where user_id=${uid}`,
    [email],
  );
  // 가슴/하체 각각의 마무리 '런닝' 행(부위마다 id 다름)
  await dbQuery(
    `insert into public.routine_conditioning
       (user_id, focus, kind, position, item_id, duration_min)
     values
       (${uid}, 'chest', 'cooldown', 0, 'running', 5),
       (${uid}, 'lower', 'cooldown', 0, 'running', 5)`,
    [email],
  );

  // 오늘(가슴) 마무리 '런닝' 완료 — 가슴 행 id 기준으로 기록.
  await dbQuery(
    `insert into public.conditioning_completions
       (user_id, for_date, kind, item_id, source_row_id, status)
     select user_id, (now() at time zone 'Asia/Seoul')::date, kind, item_id, id, 'done'
       from public.routine_conditioning
      where user_id=${uid} and kind='cooldown' and focus='chest'`,
    [email],
  );

  // 하단 '다가오는 7일' 드래그 모사: 하체를 1일차로 → 오늘 부위가 하체로 바뀜.
  // (reorderUpcomingSevenDaysAction 와 동일: start_date=오늘, custom_week 재배열,
  //  daily_conditioning 정리. routine_conditioning 은 부위 기준이라 그대로.)
  await dbQuery(
    `update public.user_routines
        set custom_week='[["lower"],["chest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
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

  // 오늘 부위가 하체로 바뀌어 마무리 행 id 는 하체 런닝(다른 id)이지만,
  // (cooldown:running) 키로 매칭돼 완료가 유지돼야 한다.
  const coolUl = page.locator("ul.space-y-2").filter({ hasText: "런닝" });
  await expect(coolUl.getByText("완료", { exact: true }).first()).toBeVisible();
});
