import { expect, test, type Page, type Route } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import {
  dbQuery,
  hasDb,
  openAuthenticatedDbClient,
  openDbClient,
} from "./helpers/db";

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

async function loadRoutineSnapshot(email: string): Promise<{
  customWeek: unknown;
  updatedAt: string;
}> {
  const rows = await dbQuery<{ custom_week: unknown; updated_at: string }>(
    `select custom_week, updated_at::text
       from public.user_routines
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email],
  );
  return {
    customWeek: rows[0]?.custom_week,
    updatedAt: rows[0]?.updated_at,
  };
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
  const swapButton = page.getByTestId("arm-swap-button");
  await expect(swapButton).toHaveCount(1);
  await swapButton.click();

  const sources = page.getByRole("group", {
    name: "팔 루틴 교환 첫 번째 일차",
  });
  const source = sources.getByRole("button", { name: /^1일차 ·/ });
  await source.click();
  await expect(source).toHaveAttribute("aria-pressed", "true");

  const targets = page.getByRole("group", {
    name: "팔 루틴 교환 두 번째 일차",
  });
  await targets.getByRole("button", { name: targetName }).click();
}

async function waitForDbLock(
  observer: Awaited<ReturnType<typeof openDbClient>>,
  applicationName: string,
) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const result = await observer.query<{ wait_event_type: string | null }>(
      `select wait_event_type
         from pg_stat_activity
        where application_name = $1
          and state = 'active'`,
      [applicationName],
    );
    if (result.rows[0]?.wait_event_type === "Lock") return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`${applicationName} did not wait on the routine lock`);
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

  const swapButton = page.getByTestId("arm-swap-button");
  await expect(swapButton).toHaveCount(1);
  await expect(page.getByTestId(/arm-swap-button-/)).toHaveCount(0);

  await swapButton.click();
  const sourceGroup = page.getByRole("group", {
    name: "팔 루틴 교환 첫 번째 일차",
  });
  await expect(sourceGroup).toBeVisible();
  await expect(
    page.getByRole("group", { name: "팔 루틴 교환 두 번째 일차" }),
  ).toHaveCount(0);

  await day0.getByRole("button", { name: "운동 추가" }).click();
  await expect(sourceGroup).toHaveCount(0);
  await expect(
    day0.getByRole("group", { name: "1일차 추가할 부위" }),
  ).toBeVisible();

  await swapButton.click();
  await expect(
    day0.getByRole("group", { name: "1일차 추가할 부위" }),
  ).toHaveCount(0);
  const source = sourceGroup.getByRole("button", { name: /^1일차 ·/ });
  await source.click();
  await expect(
    page.getByRole("group", { name: "팔 루틴 교환 두 번째 일차" }),
  ).toBeVisible();

  await swapButton.click();
  await expect(sourceGroup).toHaveCount(0);
  await swapButton.click();
  await expect(
    page.getByRole("group", { name: "팔 루틴 교환 두 번째 일차" }),
  ).toHaveCount(0);
  await swapButton.click();

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

test("같은 팔 블록을 가진 두 탭의 오래된 교환은 운동 행을 되돌리지 않는다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await seedArmRoutine(email);
  await dbQuery(
    `update public.user_routines
        set custom_week=jsonb_set(custom_week, '{1,1}', '"biceps"'::jsonb)
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email],
  );
  await dbQuery(
    `update public.routine_exercises
        set exercise_id='hammer-curl', equipment='dumbbell'
      where user_id=(select id from auth.users where lower(email)=lower($1))
        and focus='arm' and day_index=1`,
    [email],
  );

  const stalePage = await page.context().newPage();
  await Promise.all([
    page.goto("/plan", { waitUntil: "networkidle" }),
    stalePage.goto("/plan", { waitUntil: "networkidle" }),
  ]);
  const expected = await loadRoutineSnapshot(email);
  const before = await loadExerciseSnapshot(email);

  await chooseDayOneAsSwapTarget(page);
  await Promise.all([
    page.waitForEvent("framenavigated", {
      predicate: (frame) => frame === page.mainFrame(),
    }),
    page.getByRole("button", { name: "교환하기" }).click(),
  ]);
  const afterFirstSwap = await loadExerciseSnapshot(email);
  expectOnlyArmDayIndexesSwapped(before, afterFirstSwap);
  expect(await loadCustomWeek(email)).toEqual([
    ["back", "biceps"],
    ["shoulder", "biceps"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
    ["rest"],
  ]);

  const directStale = await openAuthenticatedDbClient(
    email,
    "arm-equal-stale-direct",
  );
  try {
    await expect(
      directStale.query(
        `select public.swap_custom_arm_routine($1, $2, $3::jsonb, $4::timestamptz)`,
        [0, 1, JSON.stringify(expected.customWeek), expected.updatedAt],
      ),
    ).rejects.toThrow(/STALE_ROUTINE/);
  } finally {
    await directStale.query("rollback");
    await directStale.end();
  }
  expect(await loadExerciseSnapshot(email)).toEqual(afterFirstSwap);

  await chooseDayOneAsSwapTarget(stalePage);
  await stalePage.getByRole("button", { name: "교환하기" }).click();
  await expect(
    stalePage.getByText(
      "루틴이 다른 곳에서 변경되었습니다. 새로고침 후 다시 시도해주세요.",
    ),
  ).toBeVisible();
  expect(await loadExerciseSnapshot(email)).toEqual(afterFirstSwap);
  await stalePage.close();
});

test("직접 인증 RPC의 stale revision은 팔 행과 주간을 모두 롤백한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await seedArmRoutine(email);
  const expected = await loadRoutineSnapshot(email);
  const before = await loadExerciseSnapshot(email);
  await dbQuery(
    `update public.user_routines
        set custom_week=jsonb_set(custom_week, '{6}', '["core"]'::jsonb)
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email],
  );

  const client = await openAuthenticatedDbClient(email, "arm-stale-direct");
  try {
    await expect(
      client.query(
        `select public.swap_custom_arm_routine($1, $2, $3::jsonb, $4::timestamptz)`,
        [0, 1, JSON.stringify(expected.customWeek), expected.updatedAt],
      ),
    ).rejects.toThrow(/STALE_ROUTINE/);
  } finally {
    await client.query("rollback");
    await client.end();
  }

  expect(await loadExerciseSnapshot(email)).toEqual(before);
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

test("수동 저장과 교환은 부모 잠금 순서대로 직렬화되어 팔 행을 중복하지 않는다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await seedArmRoutine(email);
  const expected = await loadRoutineSnapshot(email);
  const observer = await openDbClient("arm-lock-observer");
  const saver = await openAuthenticatedDbClient(email, "arm-save-waiter");
  const swapper = await openAuthenticatedDbClient(email, "arm-swap-waiter");
  try {
    await observer.query("begin");
    await observer.query(
      `select 1
         from public.user_routines
        where user_id=(select id from auth.users where lower(email)=lower($1))
        for update`,
      [email],
    );

    const savePromise = saver.query(
      `select * from public.replace_routine_exercise_groups(
         $1::timestamptz,
         false,
         $2::jsonb
       )`,
      [
        expected.updatedAt,
        JSON.stringify([
          {
            dayIndex: 0,
            focus: "arm",
            rows: [
              {
                position: 0,
                exerciseId: "hammer-curl",
                equipment: "dumbbell",
                sets: 3,
                reps: 10,
                weightKg: 10,
                setDetails: null,
                memo: "동시 저장",
              },
            ],
          },
        ]),
      ],
    );
    await waitForDbLock(observer, "arm-save-waiter");

    const swapPromise = swapper.query(
      `select public.swap_custom_arm_routine($1, $2, $3::jsonb, $4::timestamptz)`,
      [0, 1, JSON.stringify(expected.customWeek), expected.updatedAt],
    );
    const staleSwap = expect(swapPromise).rejects.toThrow(/STALE_ROUTINE/);

    await observer.query("commit");
    await savePromise;
    await waitForDbLock(observer, "arm-swap-waiter");
    await saver.query("commit");
    await staleSwap;
    await swapper.query("rollback");
  } finally {
    await Promise.allSettled([
      observer.query("rollback"),
      saver.query("rollback"),
      swapper.query("rollback"),
    ]);
    await Promise.all([observer.end(), saver.end(), swapper.end()]);
  }

  expect(await loadArmDayIndexes(email)).toEqual([
    { exercise_id: "hammer-curl", day_index: 0 },
    { exercise_id: "triceps-pushdown", day_index: 1 },
  ]);
  expect(await loadCustomWeek(email)).toEqual(initialWeek);
});

test("팔 교환 요청 중에는 운동 편집을 잠그고 오류 후 다시 활성화한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await seedArmRoutine(email);
  await page.goto("/plan", { waitUntil: "networkidle" });

  let resolveHeld!: () => void;
  const requestHeld = new Promise<void>((resolve) => {
    resolveHeld = resolve;
  });
  let releaseRequest!: () => void;
  const requestReleased = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  let resolveAborted!: () => void;
  const requestAborted = new Promise<void>((resolve) => {
    resolveAborted = resolve;
  });
  let isRequestHeld = false;
  const holdServerAction = async (route: Route) => {
    const request = route.request();
    if (
      request.method() !== "POST" ||
      !request.headers()["next-action"]
    ) {
      await route.continue();
      return;
    }
    isRequestHeld = true;
    resolveHeld();
    await requestReleased;
    try {
      await route.abort();
    } finally {
      resolveAborted();
    }
  };
  await page.route("**/*", holdServerAction);

  const day0 = page.locator('[data-plan-day-index="0"]');
  const addButton = day0.getByRole("button", { name: "운동 추가" });
  try {
    await chooseDayOneAsSwapTarget(page);
    await page.getByRole("button", { name: "교환하기" }).click();
    await requestHeld;

    await expect(
      page.locator('fieldset[aria-busy="true"]'),
    ).toBeVisible();
    const mutationControls = [
      addButton,
      day0.getByRole("button", { name: "추천으로 채우기" }).first(),
      day0.getByRole("button", { name: "1일차 저장" }),
      day0.getByTestId("delete-row-0:back-0"),
      day0.getByRole("button", { name: "드래그로 순서 변경" }).first(),
      day0.getByLabel("기구").first(),
      page.getByTestId("arm-swap-button"),
      page.getByRole("button", { name: "추천으로 등록" }),
      page.getByTestId("clear-all-exercises"),
    ];
    for (const control of mutationControls) {
      await expect(control).toBeDisabled();
    }

    await expect(
      day0.getByRole("group", { name: "1일차 추가할 부위" }),
    ).toHaveCount(0);
    await addButton.evaluate((button) => (button as HTMLElement).click());
    await expect(
      day0.getByRole("group", { name: "1일차 추가할 부위" }),
    ).toHaveCount(0);
  } finally {
    releaseRequest();
    if (isRequestHeld) await requestAborted;
    await page.unroute("**/*", holdServerAction);
  }

  await expect(page.getByText("팔 루틴 교환에 실패했습니다.")).toBeVisible();
  await expect(addButton).toBeEnabled();
});

test("본운동 저장 중에는 새 편집을 만들 수 없어 이전 저장 완료가 dirty를 지우지 않는다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await seedArmRoutine(email);
  await page.goto("/plan", { waitUntil: "networkidle" });
  const day0 = page.locator('[data-plan-day-index="0"]');

  let releaseRequest!: () => void;
  const requestReleased = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  let requestHeldResolve!: () => void;
  const requestHeld = new Promise<void>((resolve) => {
    requestHeldResolve = resolve;
  });
  let requestContinuedResolve!: () => void;
  const requestContinued = new Promise<void>((resolve) => {
    requestContinuedResolve = resolve;
  });
  const holdSave = async (route: Route) => {
    const request = route.request();
    if (request.method() !== "POST" || !request.headers()["next-action"]) {
      await route.continue();
      return;
    }
    requestHeldResolve();
    await requestReleased;
    await route.continue();
    requestContinuedResolve();
  };
  await page.route("**/*", holdSave);

  await day0.getByRole("button", { name: "1일차 저장" }).click();
  await requestHeld;
  await expect(page.locator('fieldset[aria-busy="true"]')).toBeVisible();
  const addButton = day0.getByRole("button", { name: "운동 추가" });
  await expect(addButton).toBeDisabled();
  await addButton.evaluate((button) => (button as HTMLElement).click());
  await expect(
    day0.getByRole("group", { name: "1일차 추가할 부위" }),
  ).toHaveCount(0);

  releaseRequest();
  await requestContinued;
  await page.unroute("**/*", holdSave);
  await expect(page.getByText("1일차 저장됨")).toBeVisible();
});

test("이미 열린 운동 검색 포털은 본운동 저장이 시작되면 닫혀 편집할 수 없다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await seedArmRoutine(email);
  await page.goto("/plan", { waitUntil: "networkidle" });
  const day0 = page.locator('[data-plan-day-index="0"]');

  await day0
    .getByRole("button", { name: "운동", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();

  let releaseRequest!: () => void;
  const requestReleased = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  let requestHeldResolve!: () => void;
  const requestHeld = new Promise<void>((resolve) => {
    requestHeldResolve = resolve;
  });
  let portalRequestContinuedResolve!: () => void;
  const portalRequestContinued = new Promise<void>((resolve) => {
    portalRequestContinuedResolve = resolve;
  });
  const holdSave = async (route: Route) => {
    const request = route.request();
    if (request.method() !== "POST" || !request.headers()["next-action"]) {
      await route.continue();
      return;
    }
    requestHeldResolve();
    await requestReleased;
    await route.continue();
    portalRequestContinuedResolve();
  };
  await page.route("**/*", holdSave);

  await day0
    .getByRole("button", { name: "1일차 저장" })
    .evaluate((button) => (button as HTMLElement).click());
  await requestHeld;
  await expect(page.locator('fieldset[aria-busy="true"]')).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  releaseRequest();
  await portalRequestContinued;
  await page.unroute("**/*", holdSave);
  await expect(page.getByText("1일차 저장됨")).toBeVisible();
});

test("미저장 워밍업 편집과 워밍업 저장 중 상태는 팔 교환을 차단한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await seedArmRoutine(email);
  const before = await loadExerciseSnapshot(email);
  await page.goto("/plan", { waitUntil: "networkidle" });

  const warmup = page.getByTestId("conditioning-editor-0:back:warmup");
  await warmup.getByRole("button", { name: "추가" }).click();
  await chooseDayOneAsSwapTarget(page);
  await expect(
    page.getByText(
      "저장하지 않은 운동 변경이 있습니다. 먼저 각 일차를 저장해주세요.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await loadExerciseSnapshot(email)).toEqual(before);

  let releaseRequest!: () => void;
  const requestReleased = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  let requestHeldResolve!: () => void;
  const requestHeld = new Promise<void>((resolve) => {
    requestHeldResolve = resolve;
  });
  let conditioningRequestContinuedResolve!: () => void;
  const conditioningRequestContinued = new Promise<void>((resolve) => {
    conditioningRequestContinuedResolve = resolve;
  });
  const holdConditioningSave = async (route: Route) => {
    const request = route.request();
    if (request.method() !== "POST" || !request.headers()["next-action"]) {
      await route.continue();
      return;
    }
    requestHeldResolve();
    await requestReleased;
    await route.continue();
    conditioningRequestContinuedResolve();
  };
  await page.route("**/*", holdConditioningSave);
  await warmup.getByRole("button", { name: "항목", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await warmup
    .getByRole("button", { name: "저장" })
    .evaluate((button) => (button as HTMLElement).click());
  await requestHeld;
  await expect(page.getByTestId("arm-swap-button")).toBeDisabled();
  await expect(warmup).toHaveAttribute("aria-busy", "true");
  await expect(
    page.locator('fieldset[aria-busy="true"]').first(),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  releaseRequest();
  await conditioningRequestContinued;
  await page.unroute("**/*", holdConditioningSave);
  await expect(warmup.getByText("저장됨")).toBeVisible();
});

test("교환 확인 모달은 배경을 inert 처리하고 실행 시 dirty 상태를 다시 검사한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await seedArmRoutine(email);
  const before = await loadExerciseSnapshot(email);
  await page.goto("/plan", { waitUntil: "networkidle" });
  await chooseDayOneAsSwapTarget(page);

  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "교환하기" });
  const cancel = dialog.getByRole("button", { name: "취소" });
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(confirm).toBeFocused();

  const backgroundDelete = page.getByTestId("delete-row-0:back-0");
  expect(
    await backgroundDelete.evaluate((element) =>
      Boolean(element.closest("[inert]")),
    ),
  ).toBe(true);
  await backgroundDelete.evaluate((button) => (button as HTMLElement).click());
  await confirm.click();
  await expect(
    page.getByText(
      "저장하지 않은 운동 변경이 있습니다. 먼저 각 일차를 저장해주세요.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await loadExerciseSnapshot(email)).toEqual(before);
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

test("손상되었거나 4블록인 원본 주간에는 팔 교환 컨트롤을 표시하지 않는다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await seedArmRoutine(email);

  await dbQuery(
    `update public.user_routines
        set custom_week='[["back","biceps","broken"],["shoulder","triceps"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email],
  );
  await page.goto("/plan", { waitUntil: "networkidle" });
  await expect(page.getByTestId("arm-swap-button")).toHaveCount(0);

  await dbQuery(
    `update public.user_routines
        set custom_week='[["back","biceps"],["shoulder","triceps"],["chest","back","shoulder","core"],["rest"],["rest"],["rest"],["rest"]]'::jsonb
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email],
  );
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("arm-swap-button")).toHaveCount(0);
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
