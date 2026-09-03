import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 과부하 추천을 **무게를 정하는 그 순간**에 보여준다(로드맵 2.2 남은 항목).
//
// 성장 그래프에만 있으면 정작 무게를 정할 때는 안 보인다. 여기서 확인하는 것은 둘이다.
//  ① 운동모드·계획 편집에서 추천과 **근거**가 같이 보인다
//  ② '적용'을 누르면 그 값이 실제로 입력란에 들어간다(읽고 손으로 옮겨 적지 않아도 된다)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

/** 오늘을 0일차(하체)로 만들고 본운동 하나만 남긴다. */
async function seedLowerDayWithSquat(email: string) {
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["lower"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [
    email,
  ]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [
    email,
  ]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 5, 6, 100)`,
    [email],
  );
}

/**
 * 완료 기록을 직접 넣는다.
 *
 * ⚠ `daysAgo: 0` 은 쓰지 않는다 — 오늘 완료한 운동은 운동모드 큐에서 빠지므로
 * 추천을 볼 화면 자체가 없어진다.
 */
async function seedCompletion(
  email: string,
  opts: { daysAgo: number; reps: number; weightKg: number },
) {
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus, sets, reps, weight_kg)
     values (${uid}, ${today} - $2::int, gen_random_uuid(), 'done', 'squat', 'barbell', 'lower', 5, $3::int, $4::numeric)`,
    [email, opts.daysAgo, opts.reps, opts.weightKg],
  );
}

/** 목표 횟수는 경력에 따라 달라진다 — 추천을 확정적으로 보려면 고정한다(상급자 heavy = 6회). */
async function setAdvanced(email: string) {
  await dbQuery(
    `update public.profiles set experience='advanced' where user_id=${uid}`,
    [email],
  );
}

test("운동모드에서 추천이 근거와 함께 보이고, '적용'이 무게를 바꾼다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await setAdvanced(email);
  await seedLowerDayWithSquat(email);

  // 두 세션 모두 목표(6회)를 채웠고 100 → 105 로 올랐다 → 다음은 한 단계 위 110kg.
  await seedCompletion(email, { daysAgo: 14, reps: 6, weightKg: 100 });
  await seedCompletion(email, { daysAgo: 7, reps: 6, weightKg: 105 });

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);

  const hint = page.getByTestId("overload-hint-squat");
  await expect(hint).toBeVisible({ timeout: 8000 });
  await expect(hint).toHaveAttribute("data-action", "increase");
  // 숫자만 던지면 따를지 무시할지 판단을 못 한다 — 근거가 같이 나와야 한다.
  await expect(hint).toContainText("110kg");
  await expect(hint).toContainText(/목표\(6회\)를 채웠어요/);

  // 비고정 모드라 무게는 지난번 실제값(105kg)으로 미리 채워져 있다.
  const weight = page.getByRole("slider", { name: "무게" });
  await expect(weight).toHaveAttribute("aria-valuenow", "105");

  await page.getByTestId("overload-apply-squat").click();
  await expect(weight).toHaveAttribute("aria-valuenow", "110");
});

test("정체하면 운동모드에서도 디로드를 권한다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await setAdvanced(email);
  await seedLowerDayWithSquat(email);

  // 같은 무게로 네 번 — 최고치가 세 세션째 그대로다.
  for (const daysAgo of [28, 21, 14, 7]) {
    await seedCompletion(email, { daysAgo, reps: 6, weightKg: 100 });
  }

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);

  const hint = page.getByTestId("overload-hint-squat");
  await expect(hint).toBeVisible({ timeout: 8000 });
  await expect(hint).toHaveAttribute("data-action", "deload");
  await expect(hint).toContainText("90kg");
  await expect(hint).toContainText(/최고치가 안 늘었어요/);
});

test("기록이 없는 운동에는 추천을 붙이지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedLowerDayWithSquat(email);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);

  // 스크러버는 뜨지만(운동모드는 정상) 추천 칸은 없다.
  await expect(page.getByRole("slider", { name: "무게" })).toBeVisible({
    timeout: 8000,
  });
  await expect(page.getByTestId("overload-hint-squat")).toHaveCount(0);
});

test("계획 편집(무게 고정 모드)에서도 추천이 보이고 '적용'이 입력란을 채운다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await setAdvanced(email);
  await seedLowerDayWithSquat(email);
  // 무게·횟수를 이 화면에서 정하는 모드여야 제안을 넣을 칸이 있다.
  await dbQuery(
    `update public.profiles set lock_weight_reps=true where user_id=${uid}`,
    [email],
  );
  await seedCompletion(email, { daysAgo: 14, reps: 6, weightKg: 100 });
  await seedCompletion(email, { daysAgo: 7, reps: 6, weightKg: 105 });

  await page.goto("/plan", { waitUntil: "networkidle" });

  const hint = page.getByTestId("overload-hint-squat").first();
  await expect(hint).toBeVisible({ timeout: 10000 });
  await expect(hint).toContainText("110kg");

  const weight = page.getByLabel("무게(kg)").first();
  await expect(weight).toHaveValue("100");
  await page.getByTestId("overload-apply-squat").first().click();
  await expect(weight).toHaveValue("110");
});
