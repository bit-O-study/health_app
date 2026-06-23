import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 사용자 시나리오: 마무리(쿨다운)를 완료한 뒤 루틴을 바꿔 오늘 부위(focus)가 달라지면
// 마무리 종목 자체가 바뀐다(런닝→차일드포즈). 이때 '다른 종목'은 완료로 번지면 안 된다
// — 본운동과 동일하게 (종류:항목)으로만 매칭한다. (예전엔 "종일 완료" 규칙으로 번졌는데,
// 새 종목이 완료로 떠 버리고 취소도 안 돼 버그로 보고됨 → 동작 변경.)

test("루틴변경으로 마무리 종목이 달라지면(런닝→차일드포즈) 새 종목은 완료로 안 뜬다", async ({
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

  // 오늘 부위가 등으로 바뀌어 마무리 종목이 차일드포즈(런닝과 다른 종목)가 됐다.
  // ① 새 종목(차일드포즈)은 완료가 아니어야 한다 — 런닝 완료가 번지면 안 됨.
  const childRow = page.locator("li").filter({ hasText: "차일드 포즈" }).first();
  await expect(childRow).toBeVisible({ timeout: 8000 });
  await expect(childRow.getByText("완료", { exact: true })).toHaveCount(0);
  // ② 완료했던 마무리(런닝)는 종목이 바뀌어도 완료로 그대로 남아야 한다(본운동과 동일).
  const runRow = page.locator("li").filter({ hasText: "런닝" }).first();
  await expect(runRow.getByText("완료", { exact: true }).first()).toBeVisible();
});
