import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 회귀 가드: 운동 모드 본문이 내용이 길어도(영상+사진+애니메이션+가이드) 맨 위까지
// 스크롤돼 보여야 한다. 과거 justify-center 라 내용이 길면 위쪽이 잘려 영상을 못 봤다.
// (bench-press 는 관리자 영상이 있어 본문이 특히 길다.)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("운동 모드 본문이 맨 위(본운동 배지)까지 스크롤된다 — 영상 안 잘림", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
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
     values (${uid}, 0, 'chest', 0, 'bench-press', 'barbell', 4, 8, 60)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);

  const scroll = page.getByTestId("guided-scroll");
  await expect(scroll).toBeVisible({ timeout: 8000 });

  // 맨 위로 스크롤한 뒤, 첫 요소(본운동 배지)가 컨테이너 위쪽 경계 밖으로 잘리지 않아야 한다.
  await scroll.evaluate((el) => {
    el.scrollTop = 0;
  });
  const badge = page.getByText("본운동", { exact: true }).first();
  await expect(badge).toBeVisible();
  const notClipped = await badge.evaluate((b) => {
    const sc = b.closest("[data-testid='guided-scroll']") as HTMLElement | null;
    if (!sc) return false;
    // 배지 상단이 스크롤 컨테이너 상단보다 아래(또는 같음)여야 = 위로 안 잘림.
    return b.getBoundingClientRect().top >= sc.getBoundingClientRect().top - 2;
  });
  expect(notClipped).toBe(true);
});
