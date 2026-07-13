import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 재현/회귀: 운동 모드(가이드)에서 두 번째 운동(해머컬)까지 넘긴 뒤 '운동법·꿀팁 보기'로
// 상세를 열고 뒤로 오면, 예전엔 index 가 0 으로 초기화돼 첫 운동(스쿼트)으로 돌아갔다.
// 이제는 마지막으로 보던 운동(해머컬)에서 이어봐야 한다. (workout-edit-store.activeRow)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("운동법 보고 뒤로 오면 보던 운동에서 이어본다(첫 운동으로 안 돌아감)", async ({
  page,
}) => {
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
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60),
            (${uid}, 0, 'lower', 1, 'hammer-curl', 'dumbbell', 4, 12, 10)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);

  const overlay = page.getByTestId("guided-scroll");
  // 첫 운동은 스쿼트
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toBeVisible({
    timeout: 8000,
  });
  // 완료하지 말고 '다음 운동'으로 해머컬까지 이동
  await page.getByRole("button", { name: "다음 운동" }).click();
  await expect(overlay.getByRole("heading", { name: "해머컬" })).toBeVisible({
    timeout: 8000,
  });

  // '운동법·꿀팁 보기' → 상세 페이지로 이동 (App Router 소프트 내비 — load 이벤트가
  // 안 뜨므로 waitForURL(load) 대신 URL 폴링으로 확인).
  await page.getByRole("button", { name: "운동법·꿀팁 보기" }).click();
  // dev 모드는 /exercises/[slug] 첫 컴파일이 느려 커밋이 늦다 → 넉넉히.
  await expect(page).toHaveURL(/\/exercises\//, { timeout: 30000 });

  // 뒤로 → 운동 모드가 다시 열리고, 해머컬에서 이어봐야 한다
  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await expect(overlay.getByRole("heading", { name: "해머컬" })).toBeVisible({
    timeout: 8000,
  });
  // 첫 운동(스쿼트)으로 돌아가면 버그
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toHaveCount(0);
});