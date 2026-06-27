import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 수동(메인 리스트 스와이프) 완료도 운동모드(가이드)와 동일하게 완료 기록(스냅샷)을 남겨
// 점수·성장그래프 등 통계에 반영돼야 한다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("수동 완료(스와이프)가 완료기록·성장그래프에 반영된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  // 고정 켬: 메인에 무게/세트가 보이고 스냅샷도 계획값으로 확정.
  await dbQuery(`update public.profiles set lock_weight_reps=true where user_id=${uid}`, [email]);
  await dbQuery(
    `update public.user_routines set splits=0, variant_id='custom',
        custom_week='[["lower"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
        start_date=${today}, day_index_migrated=true, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 수동 완료: 운동모드(가이드) 안 쓰고 메인의 '오늘 전부 완료'로 완료 처리.
  const row = page.locator("li").filter({ hasText: "스쿼트" }).first();
  await expect(row).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: /오늘 전부 완료/ }).click();
  await page.waitForTimeout(1500);

  // 완료 배지 표시
  await expect(row.getByText("완료", { exact: true })).toBeVisible({ timeout: 8000 });

  // DB: 완료 기록 + 스냅샷(무게/세트/운동)
  const done = await dbQuery<{ exercise_id: string; weight_kg: string; sets: string; status: string }>(
    `select exercise_id, weight_kg::text, sets::text, status from public.exercise_completions
       where user_id=${uid} and status='done'`,
    [email],
  );
  expect(done.length).toBe(1);
  expect(done[0].exercise_id).toBe("squat");
  expect(Number(done[0].weight_kg)).toBe(60);
  expect(Number(done[0].sets)).toBe(4);

  // 성장그래프: 수동 완료가 반영돼 빈 상태가 아니고 스쿼트가 나온다.
  await page.goto("/settings/progress", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await expect(page.getByText("아직 중량 운동 완료 기록이 없어요")).toHaveCount(0);
  await expect(page.getByText("스쿼트").first()).toBeVisible({ timeout: 8000 });
});
