import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 운동하기(가이드)에서 본운동 차례가 되면, 등록 영상이 없어도 free-exercise-db 실사 사진
// (시작/끝 2프레임)이 표시돼야 한다 — 스쿼트 = Barbell_Squat. (SVG 폴백이 아니라 실사)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("가이드 본운동에 실사 시연 사진(스쿼트)이 뜬다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 오늘 = 하체, 본운동은 스쿼트 1개만(가이드에서 워밍업 뒤 바로 스쿼트).
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
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);

  // 가이드는 워밍업부터 — 본운동(스쿼트)에 닿을 때까지 '넘기기'.
  const squatImg = page.locator('img[src*="Barbell_Squat"]');
  for (let i = 0; i < 8; i++) {
    if (await squatImg.count()) break;
    const next = page.getByRole("button", { name: "넘기기" });
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(500);
  }

  // 스쿼트 차례 — 실사 사진(0/1 프레임)이 보인다(SVG 폴백 아님).
  await expect(squatImg.first()).toBeVisible({ timeout: 8000 });
  const srcs = await squatImg.evaluateAll((els) =>
    (els as HTMLImageElement[]).map((e) => e.src),
  );
  expect(srcs.some((s) => s.includes("/Barbell_Squat/0.jpg"))).toBe(true);
  expect(srcs.some((s) => s.includes("/Barbell_Squat/1.jpg"))).toBe(true);
});
