import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 버그1: "오늘만 운동 바꾸기"
//  - 운동 전체 바꾸기: 부위를 바꿔도 이미 완료한 운동은 오늘 화면에 완료 배지로 남는다.
//  - 오늘만 부위 추가: 기존 부위는 그대로 두고 선택 부위를 더한다(합집합).

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function setBackToday(email: string) {
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["back"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 0, 'back', 0, 'lat-pulldown', 'machine', 4, 10, 40),
       (${uid}, 0, 'back', 1, 'deadlift', 'barbell', 4, 6, 80)`,
    [email],
  );
}

test("전체 바꾸기: 등 완료 후 가슴으로 바꿔도 등 완료가 오늘 화면에 남는다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await setBackToday(email);

  // 등 운동 2개를 오늘 완료 처리(스냅샷 focus/exercise_id 포함).
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, focus, exercise_id, equipment, sets, reps, weight_kg)
     select user_id, ${today}, id, 'done', focus, exercise_id, equipment, sets, reps, weight_kg
       from public.routine_exercises where user_id=${uid} and focus='back'`,
    [email],
  );

  // "운동 전체 바꾸기 → 가슴" 모사: 오늘 daily_plan 을 가슴으로 대체.
  await dbQuery(
    `insert into public.daily_plan (user_id, for_date, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, ${today}, 'chest', 0, 'bench-press', 'barbell', 4, 8, 40),
       (${uid}, ${today}, 'chest', 1, 'incline-press', 'barbell', 4, 10, 35)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 새 부위(가슴) 본운동이 보인다.
  await expect(page.getByText("벤치프레스").first()).toBeVisible();
  // 바꾸기 전 완료한 등 운동(데드리프트)이 '완료' 배지와 함께 남아 있다.
  const deadRow = page.locator("li").filter({ hasText: "데드리프트" });
  await expect(deadRow.getByText("완료", { exact: true }).first()).toBeVisible();
});

test("부위 추가: 등에 가슴을 더하면 등과 가슴이 함께 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await setBackToday(email);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await expect(page.getByText("데드리프트").first()).toBeVisible();

  // "오늘만 운동 바꾸기" 모달 → 가슴 선택 → "오늘만 부위 추가"
  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).click();
  await page.getByRole("button", { name: "가슴" }).click();
  await page.getByRole("button", { name: "오늘만 부위 추가" }).click();

  // /plan/today 로 이동 — 가슴 섹션을 추천으로 채우고 저장.
  await page.waitForURL("**/plan/today**", { timeout: 30_000 });
  await page.getByRole("button", { name: "추천으로 채우기" }).first().click();
  await page.getByRole("button", { name: "저장", exact: true }).first().click();
  await expect(page.getByText("저장됨").first()).toBeVisible({ timeout: 15_000 });

  // 홈으로 — 등(데드리프트, 고정됨)과 가슴(벤치프레스)이 함께 보여야 한다.
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await expect(page.getByText("데드리프트").first()).toBeVisible();
  await expect(page.getByText("벤치프레스").first()).toBeVisible();
});