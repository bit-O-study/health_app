import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 검증: '오늘만 부위 추가'는 오늘(daily_plan)만 바꾸고 영구 루틴(routine_exercises)은
// 건드리지 않는다 → 다음에 이 루틴 요일이 다시 와도 추가한 부위는 없어야 한다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function dismissNudge(page: Page) {
  const later = page.getByRole("button", { name: "나중에" });
  if (await later.count()) await later.first().click().catch(() => {});
}

test("오늘만 부위 추가는 daily_plan(오늘)만 — routine_exercises 영구변경 없음", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 오늘 = 가슴만인 루틴. 영구 루틴엔 벤치프레스 1개.
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null,
            last_deferred_date=null, deferred_target=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.daily_plan where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'chest', 0, 'bench-press', 'barbell', 4, 8, 60)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 오늘만 운동 바꾸기 → 어깨 → 오늘만 부위 추가
  await dismissNudge(page);
  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();
  await expect(
    page.getByRole("heading", { name: "오늘만 운동 바꾸기" }),
  ).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: "어깨", exact: true }).click();
  await page.getByRole("button", { name: "오늘만 부위 추가" }).click();
  await expect(page).toHaveURL(/\/plan\/today.*add=1/, { timeout: 30000 });
  await page.waitForTimeout(1200);

  // 운동 한 줄 추가 → 그 줄 부위를 '어깨'로 → 저장
  await page.getByRole("button", { name: "운동 추가" }).first().click();
  await page.getByLabel("부위").last().selectOption("shoulder");
  await page.waitForTimeout(300);
  // 본운동 편집기 저장(첫 번째 '저장' — 워밍업/마무리 저장 버튼과 구분).
  await page.getByRole("button", { name: "저장", exact: true }).first().click();
  await expect(page.getByText("저장됨")).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(800);

  // 영구 루틴엔 어깨가 없어야 한다(오늘만).
  const routineShoulder = await dbQuery<{ n: string }>(
    `select count(*)::text as n from public.routine_exercises
      where user_id=${uid} and focus='shoulder'`,
    [email],
  );
  expect(routineShoulder[0]?.n).toBe("0");

  // 영구 루틴엔 원래 가슴(벤치)만 그대로.
  const routineAll = await dbQuery<{ focus: string; exercise_id: string }>(
    `select focus, exercise_id from public.routine_exercises where user_id=${uid}`,
    [email],
  );
  expect(routineAll).toHaveLength(1);
  expect(routineAll[0]).toMatchObject({ focus: "chest", exercise_id: "bench-press" });

  // 오늘(daily_plan)엔 어깨가 들어가 있어야 한다.
  const dailyShoulder = await dbQuery<{ n: string }>(
    `select count(*)::text as n from public.daily_plan
      where user_id=${uid} and for_date=${today} and focus='shoulder'`,
    [email],
  );
  expect(Number(dailyShoulder[0]?.n)).toBeGreaterThan(0);

  // daily_plan 오버라이드는 오늘 날짜만 — 미래 날짜엔 없다(다음 주기엔 사라짐).
  const dailyFuture = await dbQuery<{ n: string }>(
    `select count(*)::text as n from public.daily_plan
      where user_id=${uid} and for_date > ${today} and focus='shoulder'`,
    [email],
  );
  expect(dailyFuture[0]?.n).toBe("0");
});
