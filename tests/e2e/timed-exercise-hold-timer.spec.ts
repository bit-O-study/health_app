import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// #10: 플랭크 등 시간(초) 기반 운동은 운동모드에서 '초 타이머'(카운트업)를 보여주고,
// 완료를 누르면 세트가 완료된다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function dismissNudge(page: Page) {
  for (const label of ["나중에", "다시는 안 보기", "닫기"]) {
    const b = page.getByRole("button", { name: label });
    if (await b.count()) await b.first().click().catch(() => {});
    await page.waitForTimeout(150);
  }
}

test("시간 기반 운동(플랭크)은 운동모드에서 초 타이머가 뜨고 카운트업된다(#10)", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["core"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
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
     values (${uid}, 0, 'core', 0, 'plank', 'bodyweight', 3, 40, null)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await dismissNudge(page);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);

  const overlay = page.getByTestId("guided-scroll");
  await expect(overlay.getByRole("heading", { name: "플랭크" })).toBeVisible({
    timeout: 8000,
  });

  // 목표 시간(초) 안내 + 초 타이머가 보인다.
  await expect(overlay.getByText(/목표 40초 버티기/)).toBeVisible({
    timeout: 8000,
  });
  const timer = overlay.getByLabel(/경과 \d+초/);
  await expect(timer).toBeVisible();

  // 2초 이상 지나면 카운트업 되어 0:00 이 아니어야 한다.
  await page.waitForTimeout(2300);
  await expect(timer).not.toHaveText("0:00");

  // '세트 완료'를 누르면 세트가 진행된다(세트 라벨이 2/3 로 — 하단 버튼바, overlay 바깥).
  await page.getByRole("button", { name: /세트 완료/ }).first().click();
  await page.waitForTimeout(500);
  await expect(page.getByText(/세트 2\/3/)).toBeVisible({ timeout: 8000 });
});
