import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 재현/회귀: 워밍업 하나를 완료해도 나머지 워밍업은 완료가 아니어야 한다.
// (종류 단위 완료 키가 형제 행까지 번지던 버그 — '하나 완료하면 다 완료' 방지.)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("워밍업 하나만 완료하면 나머지 워밍업은 완료가 안 된다", async ({ page }) => {
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
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.conditioning_completions where user_id=${uid}`, [email]);
  // 워밍업 2개: 보디웨이트 스쿼트 + 캣카우
  await dbQuery(
    `insert into public.routine_conditioning
       (user_id, focus, kind, position, item_id, duration_min)
     values (${uid}, 'lower', 'warmup', 0, 'bw-squat', null),
            (${uid}, 'lower', 'warmup', 1, 'cat-cow', null)`,
    [email],
  );
  // 하나(보디웨이트 스쿼트)만 완료.
  await dbQuery(
    `insert into public.conditioning_completions
       (user_id, for_date, kind, item_id, source_row_id, status)
     select user_id, ${today}, kind, item_id, id, 'done'
       from public.routine_conditioning
      where user_id=${uid} and kind='warmup' and item_id='bw-squat'`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 완료한 보디웨이트 스쿼트 행엔 '완료', 캣카우 행엔 '완료'가 없어야 한다.
  const bwRow = page.locator("li").filter({ hasText: "보디웨이트 스쿼트" }).first();
  const catRow = page.locator("li").filter({ hasText: "캣카우" }).first();
  await expect(bwRow).toBeVisible({ timeout: 8000 });
  await expect(bwRow.getByText("완료", { exact: true })).toBeVisible();
  await expect(catRow.getByText("완료", { exact: true })).toHaveCount(0);
});
