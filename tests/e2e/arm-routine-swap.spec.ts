import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

const initialWeek = [
  ["back", "biceps"],
  ["shoulder", "triceps"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
];

type ExerciseSnapshot = {
  id: string;
  day_index: number;
  focus: string;
  position: number;
  exercise_id: string;
  equipment: string;
  sets: number;
  reps: number;
  weight_kg: string | null;
  set_details: unknown;
  memo: string | null;
  created_at: string;
};

async function seedArmRoutine(email: string) {
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom', custom_week=$2::jsonb,
            baseline_routine=jsonb_build_object(
              'splits', 0, 'variant_id', 'custom', 'custom_week', $2::jsonb
            ),
            day_index_migrated=true,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            rest_date=null,
            override_date=(now() at time zone 'Asia/Seoul')::date,
            override_block='lower',
            last_deferred_date=(now() at time zone 'Asia/Seoul')::date - 1,
            deferred_target='direct',
            today_added_date=(now() at time zone 'Asia/Seoul')::date,
            today_added_blocks='core-upper-abs'
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email, JSON.stringify(initialWeek)],
  );

  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment,
        sets, reps, weight_kg, set_details, memo)
     values
       (${uid}, 0, 'back', 0, 'lat-pulldown', 'cable', 3, 10, 35, null, '등 유지'),
       (${uid}, 0, 'arm', 4, 'biceps-curl', 'dumbbell', 4, 8, 12,
        '[{"weightKg":12,"reps":8}]'::jsonb, '이두 메모'),
       (${uid}, 1, 'shoulder', 0, 'ohp', 'barbell', 3, 10, 16, null, '어깨 유지'),
       (${uid}, 1, 'arm', 7, 'triceps-pushdown', 'cable', 5, 12, 25,
        '[{"weightKg":25,"reps":12}]'::jsonb, '삼두 메모')`,
    [email],
  );
}

async function seedUnchangedRecords(email: string) {
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, exercise_id, equipment,
        sets, reps, weight_kg, focus, set_details)
     select user_id, (now() at time zone 'Asia/Seoul')::date, id, 'done',
            exercise_id, equipment, sets, reps, weight_kg, focus, set_details
       from public.routine_exercises
      where user_id=${uid} and exercise_id='biceps-curl'`,
    [email],
  );
  await dbQuery(
    `insert into public.routine_conditioning
       (user_id, focus, kind, position, item_id, duration_min, speed, incline, memo)
     values (${uid}, 'arm', 'warmup', 0, 'running', 7, 8, 1, '워밍업 유지')`,
    [email],
  );
  await dbQuery(
    `insert into public.daily_plan
       (user_id, for_date, focus, position, exercise_id, equipment,
        sets, reps, weight_kg, set_details, memo)
     values (${uid}, (now() at time zone 'Asia/Seoul')::date, 'arm', 0,
             'hammer-curl', 'dumbbell', 3, 11, 10,
             '[{"weightKg":10,"reps":11}]'::jsonb, '오늘만 유지')`,
    [email],
  );
}

async function loadExerciseSnapshot(
  email: string,
): Promise<ExerciseSnapshot[]> {
  const uid = `(select id from auth.users where lower(email)=lower($1))`;
  return dbQuery<ExerciseSnapshot>(
    `select id, day_index, focus, position, exercise_id, equipment, sets, reps,
            weight_kg::text, set_details, memo, created_at::text
       from public.routine_exercises
      where user_id=${uid}
      order by focus, exercise_id`,
    [email],
  );
}

async function loadCustomWeek(email: string): Promise<unknown> {
  const rows = await dbQuery<{ custom_week: unknown }>(
    `select custom_week
       from public.user_routines
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email],
  );
  return rows[0]?.custom_week;
}

async function loadCompletionSnapshot(
  email: string,
): Promise<Record<string, unknown>[]> {
  return dbQuery<Record<string, unknown>>(
    `select id::text, for_date::text, exercise_row_id::text, status,
            exercise_id, equipment, sets, reps, weight_kg::text, focus,
            set_details, created_at::text
       from public.exercise_completions
      where user_id=(select id from auth.users where lower(email)=lower($1))
      order by id`,
    [email],
  );
}

async function loadConditioningSnapshot(
  email: string,
): Promise<Record<string, unknown>[]> {
  return dbQuery<Record<string, unknown>>(
    `select id::text, focus, kind, position, item_id, duration_min,
            speed::text, incline::text, memo, sets, reps, created_at::text
       from public.routine_conditioning
      where user_id=(select id from auth.users where lower(email)=lower($1))
      order by id`,
    [email],
  );
}

async function loadDailyPlanSnapshot(
  email: string,
): Promise<Record<string, unknown>[]> {
  return dbQuery<Record<string, unknown>>(
    `select id::text, for_date::text, focus, position, exercise_id,
            equipment, sets, reps, weight_kg::text, set_details, memo,
            created_at::text
       from public.daily_plan
      where user_id=(select id from auth.users where lower(email)=lower($1))
      order by id`,
    [email],
  );
}

async function loadRoutineAuxSnapshot(
  email: string,
): Promise<Record<string, unknown> | undefined> {
  const rows = await dbQuery<Record<string, unknown>>(
    `select start_date::text, rest_date::text, override_date::text,
            override_block, baseline_routine, day_index_migrated,
            last_deferred_date::text, deferred_target,
            today_added_date::text, today_added_blocks
       from public.user_routines
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email],
  );
  return rows[0];
}

async function loadArmDayIndexes(
  email: string,
): Promise<{ exercise_id: string; day_index: number }[]> {
  return dbQuery<{ exercise_id: string; day_index: number }>(
    `select exercise_id, day_index
       from public.routine_exercises
      where user_id=(select id from auth.users where lower(email)=lower($1))
        and focus='arm'
      order by exercise_id`,
    [email],
  );
}

function expectOnlyArmDayIndexesSwapped(
  before: ExerciseSnapshot[],
  after: ExerciseSnapshot[],
) {
  expect(after).toHaveLength(before.length);
  for (const row of before) {
    const moved = after.find((candidate) => candidate.id === row.id);
    expect(moved).toBeDefined();
    expect({ ...moved, day_index: row.day_index }).toEqual(row);
    expect(moved?.day_index).toBe(
      row.focus === "arm" ? (row.day_index === 0 ? 1 : 0) : row.day_index,
    );
  }
}

async function chooseDayOneAsSwapTarget(
  page: Page,
  targetName = "2일차 · 어깨 + 팔",
) {
  const day0 = page.locator('[data-plan-day-index="0"]');
  await day0.getByTestId("arm-swap-button-0").click();
  const swapTargets = day0.getByRole("group", {
    name: "1일차 팔 루틴 교환 대상",
  });
  await expect(swapTargets).toBeVisible();
  await swapTargets
    .getByRole("button", { name: targetName })
    .click();
}

test("운동 등록에서 팔 루틴만 교환하고 관련 없는 데이터를 보존한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await seedArmRoutine(email);
  await seedUnchangedRecords(email);

  const before = await loadExerciseSnapshot(email);
  const customWeekBefore = await loadCustomWeek(email);
  const completionsBefore = await loadCompletionSnapshot(email);
  const conditioningBefore = await loadConditioningSnapshot(email);
  const dailyPlanBefore = await loadDailyPlanSnapshot(email);
  const routineAuxBefore = await loadRoutineAuxSnapshot(email);
  expect(customWeekBefore).toEqual([
    ["back", "biceps"],
    ["shoulder", "triceps"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
  ]);

  await page.goto("/plan", { waitUntil: "networkidle" });
  const day0 = page.locator('[data-plan-day-index="0"]');
  const day1 = page.locator('[data-plan-day-index="1"]');
  await expect(day0).toContainText("등 · 팔");
  await expect(day1).toContainText("어깨 · 팔");
  await expect(day0.getByText("이두", { exact: true })).toHaveCount(0);
  await expect(day1.getByText("삼두", { exact: true })).toHaveCount(0);

  await chooseDayOneAsSwapTarget(page);
  await expect(page.getByRole("dialog")).toContainText(
    "1일차 팔 루틴과 2일차 팔 루틴을 교환할까요?",
  );
  await Promise.all([
    page.waitForEvent("framenavigated", {
      predicate: (frame) => frame === page.mainFrame(),
    }),
    page.getByRole("button", { name: "교환하기" }).click(),
  ]);
  await page.waitForLoadState("networkidle");

  const after = await loadExerciseSnapshot(email);
  expectOnlyArmDayIndexesSwapped(before, after);
  expect(await loadCustomWeek(email)).toEqual([
    ["back", "triceps"],
    ["shoulder", "biceps"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
  ]);
  expect(await loadCompletionSnapshot(email)).toEqual(completionsBefore);
  expect(await loadConditioningSnapshot(email)).toEqual(conditioningBefore);
  expect(await loadDailyPlanSnapshot(email)).toEqual(dailyPlanBefore);
  expect(await loadRoutineAuxSnapshot(email)).toEqual(routineAuxBefore);

  const reloadedDay0 = page.locator('[data-plan-day-index="0"]');
  await reloadedDay0.getByRole("button", { name: "운동 추가" }).click();
  await reloadedDay0
    .getByRole("button", { name: "팔 운동 추가" })
    .click();
  await expect(
    reloadedDay0.getByText("트라이셉스 푸시다운", { exact: true }),
  ).toHaveCount(2);
  await expect(
    reloadedDay0.getByText("바이셉스 컬", { exact: true }),
  ).toHaveCount(0);

  const reloadedDay1 = page.locator('[data-plan-day-index="1"]');
  await reloadedDay1.getByRole("button", { name: "운동 추가" }).click();
  await reloadedDay1
    .getByRole("button", { name: "팔 운동 추가" })
    .click();
  await expect(
    reloadedDay1.getByText("바이셉스 컬", { exact: true }),
  ).toHaveCount(2);
  await expect(
    reloadedDay1.getByText("트라이셉스 푸시다운", { exact: true }),
  ).toHaveCount(0);

  expect(await loadExerciseSnapshot(email)).toEqual(after);
});

const dirtyCases = [
  { label: "원본 팔", dayIndex: 0, focusName: "팔", focusKey: "0:arm" },
  { label: "대상 팔", dayIndex: 1, focusName: "팔", focusKey: "1:arm" },
  { label: "무관한 등", dayIndex: 0, focusName: "등", focusKey: "0:back" },
];

for (const dirtyCase of dirtyCases) {
  test(`미저장 ${dirtyCase.label} 편집은 팔 교환 RPC 전에 차단된다`, async ({
    page,
  }) => {
    test.skip(!hasDb, "needs .env.test.local DB creds");

    const email = await signUpAndOnboard(page);
    await seedArmRoutine(email);
    const before = await loadExerciseSnapshot(email);
    const customWeekBefore = await loadCustomWeek(email);
    expect(customWeekBefore).toEqual([
      ["back", "biceps"],
      ["shoulder", "triceps"],
      ["rest"],
      ["rest"],
      ["rest"],
      ["rest"],
      ["rest"],
    ]);

    await page.goto("/plan", { waitUntil: "networkidle" });
    const editedDay = page.locator(
      `[data-plan-day-index="${dirtyCase.dayIndex}"]`,
    );
    await editedDay.getByRole("button", { name: "운동 추가" }).click();
    await editedDay
      .getByRole("button", { name: `${dirtyCase.focusName} 운동 추가` })
      .click();
    const unsavedRow = editedDay.getByTestId(
      `plan-row-${dirtyCase.focusKey}-1`,
    );
    await expect(unsavedRow).toBeVisible();

    const serverActionRequests: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.headers()["next-action"]) {
        serverActionRequests.push(request.url());
      }
    });

    await chooseDayOneAsSwapTarget(page);
    await expect(
      page.getByText(
        "저장하지 않은 운동 변경이 있습니다. 먼저 각 일차를 저장해주세요.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(unsavedRow).toBeVisible();
    expect(serverActionRequests).toEqual([]);
    expect(await loadExerciseSnapshot(email)).toEqual(before);
    expect(await loadCustomWeek(email)).toEqual(customWeekBefore);
  });
}

test("오래된 화면의 교환 충돌은 팔 행을 부분 변경하지 않는다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await seedArmRoutine(email);
  const before = await loadExerciseSnapshot(email);

  await page.goto("/plan", { waitUntil: "networkidle" });
  await dbQuery(
    `update public.user_routines
        set custom_week=jsonb_set(custom_week, '{6}', '["core"]'::jsonb)
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email],
  );

  await chooseDayOneAsSwapTarget(page);
  await page.getByRole("button", { name: "교환하기" }).click();
  await expect(
    page.getByText(
      "루틴이 다른 곳에서 변경되었습니다. 새로고침 후 다시 시도해주세요.",
    ),
  ).toBeVisible();
  expect(await loadExerciseSnapshot(email)).toEqual(before);
  expect(await loadArmDayIndexes(email)).toEqual([
    { exercise_id: "biceps-curl", day_index: 0 },
    { exercise_id: "triceps-pushdown", day_index: 1 },
  ]);
  expect(await loadCustomWeek(email)).toEqual([
    ["back", "biceps"],
    ["shoulder", "triceps"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["core"],
  ]);
});

test("레거시 문자열 주간은 선택한 사용자만 정규화해 팔 행 ID를 보존한다", async ({
  baseURL,
  browser,
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await seedArmRoutine(email);
  await dbQuery(
    `update public.user_routines
        set custom_week='["biceps","triceps","rest","rest","rest","rest","rest"]'::jsonb
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email],
  );

  const otherContext = await browser.newContext({ baseURL });
  const otherPage = await otherContext.newPage();
  const otherEmail = await signUpAndOnboard(otherPage);
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='["forearm","rest","rest","rest","rest","rest","rest"]'::jsonb
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [otherEmail],
  );
  await otherContext.close();

  const before = await loadExerciseSnapshot(email);
  const otherWeekBefore = await loadCustomWeek(otherEmail);
  expect(otherWeekBefore).toEqual([
    "forearm",
    "rest",
    "rest",
    "rest",
    "rest",
    "rest",
    "rest",
  ]);

  await page.goto("/plan", { waitUntil: "networkidle" });
  await chooseDayOneAsSwapTarget(page, "2일차 · 팔");
  await Promise.all([
    page.waitForEvent("framenavigated", {
      predicate: (frame) => frame === page.mainFrame(),
    }),
    page.getByRole("button", { name: "교환하기" }).click(),
  ]);
  await page.waitForLoadState("networkidle");

  const after = await loadExerciseSnapshot(email);
  expectOnlyArmDayIndexesSwapped(before, after);
  expect(await loadCustomWeek(email)).toEqual([
    ["triceps"],
    ["biceps"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
  ]);
  expect(await loadArmDayIndexes(email)).toEqual([
    { exercise_id: "biceps-curl", day_index: 1 },
    { exercise_id: "triceps-pushdown", day_index: 0 },
  ]);
  expect(await loadCustomWeek(otherEmail)).toEqual(otherWeekBefore);
});
