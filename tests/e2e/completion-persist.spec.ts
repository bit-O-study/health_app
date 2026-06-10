import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 오늘 완료한 운동은 '사실'이라, 루틴을 옮겨(다가오는 7일 드래그 등) 행 UUID 가
// 새로 생겨도 오늘 화면에서 완료로 유지돼야 한다. (행 id 매칭 → 부위:운동 키 폴백)

test("루틴 변경으로 행 UUID 가 새로 생겨도 오늘 완료한 운동은 완료로 유지", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  // 루틴: 오늘(1일차)=가슴. 마이그레이션 스킵(플래그 true).
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            day_index_migrated=true, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );

  // 가슴 운동 2개 등록
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [
    email,
  ]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 0, 'chest', 0, 'bench-press', 'barbell', 3, 10, 40),
       (${uid}, 0, 'chest', 1, 'incline-press', 'barbell', 3, 10, 35)`,
    [email],
  );

  // 오늘 완료 처리 (스냅샷 focus/exercise_id 포함)
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, focus, exercise_id, sets, reps, weight_kg)
     select user_id, (now() at time zone 'Asia/Seoul')::date, id, 'done', focus, exercise_id, sets, reps, weight_kg
       from public.routine_exercises where user_id=${uid} and focus='chest'`,
    [email],
  );

  // 루틴 변경 모사: 가슴 행을 지우고 같은 운동을 새 UUID 로 재생성
  await dbQuery(
    `delete from public.routine_exercises where user_id=${uid} and focus='chest'`,
    [email],
  );
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 0, 'chest', 0, 'bench-press', 'barbell', 3, 10, 40),
       (${uid}, 0, 'chest', 1, 'incline-press', 'barbell', 3, 10, 35)`,
    [email],
  );

  // 워밍업 1개(런닝) 등록 + 오늘 완료 + 행 재생성(새 id)
  await dbQuery(
    `insert into public.routine_conditioning
       (user_id, focus, kind, position, item_id, duration_min)
     values (${uid}, 'chest', 'warmup', 0, 'running', 5)`,
    [email],
  );
  await dbQuery(
    `insert into public.conditioning_completions
       (user_id, for_date, kind, item_id, source_row_id, status)
     select user_id, (now() at time zone 'Asia/Seoul')::date, kind, item_id, id, 'done'
       from public.routine_conditioning where user_id=${uid} and kind='warmup'`,
    [email],
  );
  await dbQuery(
    `delete from public.routine_conditioning where user_id=${uid} and kind='warmup'`,
    [email],
  );
  await dbQuery(
    `insert into public.routine_conditioning
       (user_id, focus, kind, position, item_id, duration_min)
     values (${uid}, 'chest', 'warmup', 0, 'running', 5)`,
    [email],
  );

  // 완료기록은 (FK 드롭으로) 살아있어야 한다
  const comps = await dbQuery<{ n: string }>(
    `select count(*)::text n from public.exercise_completions
      where user_id=${uid} and for_date=(now() at time zone 'Asia/Seoul')::date and status='done'`,
    [email],
  );
  expect(Number(comps[0].n)).toBe(2);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 본운동(벤치프레스가 든 리스트)에 '완료' 배지가 보여야 한다 — 행 id 가 바뀌었어도
  // (부위:운동) 키로 매칭돼 완료 유지.
  const mainUl = page
    .locator("ul.space-y-2")
    .filter({ hasText: "벤치프레스" });
  await expect(mainUl.getByText("완료", { exact: true }).first()).toBeVisible();

  // 워밍업(런닝)도 행 id 가 바뀌었지만 완료 유지돼야 한다 (kind:item 키 매칭).
  const warmUl = page.locator("ul.space-y-2").filter({ hasText: "런닝" });
  await expect(warmUl.getByText("완료", { exact: true }).first()).toBeVisible();
});

// 부분 완료: 완료한 운동만 유지돼야 하고, 안 한 운동이 완료로 잘못 표시되면 안 된다.
test("부분 완료: 완료한 운동만 루틴 변경 뒤에도 완료로 남고, 안 한 운동은 미완료", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            day_index_migrated=true, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [
    email,
  ]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 0, 'chest', 0, 'bench-press', 'barbell', 3, 10, 40),
       (${uid}, 0, 'chest', 1, 'dips', 'bodyweight', 3, 10, null)`,
    [email],
  );

  // 벤치프레스만 완료 (딥스는 안 함)
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, focus, exercise_id, sets, reps, weight_kg)
     select user_id, (now() at time zone 'Asia/Seoul')::date, id, 'done', focus, exercise_id, sets, reps, weight_kg
       from public.routine_exercises where user_id=${uid} and exercise_id='bench-press'`,
    [email],
  );

  // 루틴 변경 모사: 가슴 행 전부 삭제 후 같은 운동을 새 UUID 로 재생성
  await dbQuery(
    `delete from public.routine_exercises where user_id=${uid} and focus='chest'`,
    [email],
  );
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 0, 'chest', 0, 'bench-press', 'barbell', 3, 10, 40),
       (${uid}, 0, 'chest', 1, 'dips', 'bodyweight', 3, 10, null)`,
    [email],
  );

  // 완료 기록은 정확히 1개여야 한다(벤치프레스만)
  const comps = await dbQuery<{ n: string }>(
    `select count(*)::text n from public.exercise_completions
      where user_id=${uid} and for_date=(now() at time zone 'Asia/Seoul')::date and status='done'`,
    [email],
  );
  expect(Number(comps[0].n)).toBe(1);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 벤치프레스 행: 행 UUID 가 바뀌었어도 완료 유지
  const benchRow = page.locator("li").filter({ hasText: "벤치프레스" });
  await expect(
    benchRow.getByText("완료", { exact: true }).first(),
  ).toBeVisible();

  // 딥스 행: 완료한 적 없으므로 '완료' 배지가 없어야 한다(거짓 완료 금지)
  const dipsRow = page.locator("li").filter({ hasText: "딥스" });
  await expect(dipsRow.getByText("완료", { exact: true })).toHaveCount(0);
});
