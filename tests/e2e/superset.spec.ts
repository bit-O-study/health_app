import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 슈퍼세트 — 두 운동을 쉬지 않고 번갈아 하고, 한 바퀴를 돌면 그때 쉰다.
// 여기서 확인하는 것 넷:
//  ① 루틴 편집에서 붙은 두 줄을 묶으면 DB 에 남는다
//  ② 운동모드에서 A 세트를 끝내면 **휴식 없이** 바로 B 로 넘어간다
//  ③ B 를 끝내면 그때 쉬고, 다음 바퀴를 위해 A 로 돌아와 있다
//  ④ 묶지 않은 운동은 예전 그대로 — 세트를 끝내면 바로 쉰다

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

/** 오늘을 0일차(가슴)로 만들고 본운동 두 개만 남긴다. */
async function seedTwoChestExercises(email: string, supersetGroup: number | null) {
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
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg, superset_group)
     values
       (${uid}, 0, 'chest', 0, 'bench-press', 'barbell', 3, 10, 60, $2::smallint),
       (${uid}, 0, 'chest', 1, 'push-up', 'bodyweight', 3, 12, null, $2::smallint)`,
    [email, supersetGroup],
  );
}

/** 운동모드 오버레이 안으로 범위를 좁힌다 — 뒤 목록에도 같은 운동 이름이 있다. */
function guided(page: import("@playwright/test").Page) {
  return page.getByTestId("guided-scroll");
}

async function startWorkout(page: import("@playwright/test").Page) {
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);
}

test("루틴 편집에서 두 운동을 슈퍼세트로 묶으면 DB 에 남는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedTwoChestExercises(email, null);

  await page.goto("/plan", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const link = page.getByTestId("superset-link").first();
  await expect(link).toBeVisible({ timeout: 10000 });
  await expect(link.getByRole("button")).toHaveAttribute("aria-pressed", "false");

  await link.getByRole("button").click();
  await expect(link.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  // 묶인 두 줄에 A·B 배지가 붙는다.
  await expect(page.getByTestId("superset-badge")).toHaveCount(2);

  await page.getByRole("button", { name: /일차 저장/ }).first().click();
  // 저장이 실제로 끝났는지 먼저 확인 — 안 그러면 아래 poll 이 "왜 null 인지"를 못 알려준다.
  await expect(page.getByText("1일차 저장됨")).toBeVisible({ timeout: 15000 });
  await expect
    .poll(
      async () => {
        const rows = await dbQuery<{ superset_group: number | null }>(
          `select superset_group from public.routine_exercises
            where user_id=${uid} order by position`,
          [email],
        );
        return rows.map((r) => r.superset_group);
      },
      { timeout: 15000 },
    )
    .toEqual([1, 1]);
});

test("A 세트를 끝내면 휴식 없이 바로 B 로 넘어간다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedTwoChestExercises(email, 1);

  await startWorkout(page);

  // A(벤치프레스)에 슈퍼세트 표시가 붙어 있다.
  await expect(page.getByTestId("superset-tag")).toHaveAttribute("data-label", "A", {
    timeout: 10000,
  });
  await expect(guided(page).getByRole("heading", { name: "벤치프레스" })).toBeVisible();

  // 버튼이 '바로 다음' 이라고 예고한다 — 휴식이 올 줄 알고 기다리지 않게.
  const setBtn = page.getByRole("button", { name: /세트 완료 · 바로 다음/ });
  await expect(setBtn).toBeVisible();
  await setBtn.click();

  // 휴식 화면 없이 B(푸시업)로.
  await expect(page.getByTestId("superset-tag")).toHaveAttribute("data-label", "B", {
    timeout: 8000,
  });
  await expect(guided(page).getByRole("heading", { name: "푸시업" })).toBeVisible();
});

test("B 를 끝내면 그때 쉬고, 다음 바퀴를 위해 A 로 돌아와 있다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedTwoChestExercises(email, 1);

  await startWorkout(page);
  await page.getByRole("button", { name: /세트 완료 · 바로 다음/ }).click();
  await expect(page.getByTestId("superset-tag")).toHaveAttribute("data-label", "B", {
    timeout: 8000,
  });

  // B 는 묶음의 끝 — 버튼이 평범한 '세트 완료' 로 돌아온다.
  const last = page.getByRole("button", { name: "세트 완료", exact: true });
  await expect(last).toBeVisible();
  await last.click();

  // 쉬고 나면 다음 바퀴의 A 가 떠 있어야 한다.
  await expect(page.getByTestId("superset-tag")).toHaveAttribute("data-label", "A", {
    timeout: 8000,
  });
  await expect(guided(page).getByRole("heading", { name: "벤치프레스" })).toBeVisible();
});

test("묶지 않은 운동은 예전 그대로 — 표시도 없고 바로 쉰다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedTwoChestExercises(email, null);

  await startWorkout(page);

  await expect(guided(page).getByRole("heading", { name: "벤치프레스" })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId("superset-tag")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /바로 다음/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "세트 완료", exact: true })).toBeVisible();
});

test("🔴 부위가 달라도 번호가 같으면 안 묶인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  // 가슴·등 한 일차. 둘 다 편집기에서 1번을 받았지만 서로 남남이다.
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest","back"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg, superset_group)
     values
       (${uid}, 0, 'chest', 0, 'bench-press', 'barbell', 3, 10, 60, 1),
       (${uid}, 0, 'back', 0, 'lat-pulldown', 'machine', 3, 10, 40, 1)`,
    [email],
  );

  await startWorkout(page);
  await expect(guided(page).getByRole("heading", { name: "벤치프레스" })).toBeVisible({
    timeout: 10000,
  });
  // 각자 혼자라 묶음이 아니다 — 표시가 없어야 한다.
  await expect(page.getByTestId("superset-tag")).toHaveCount(0);
});
