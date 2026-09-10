import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 원판 계산 — 앱은 **총중량**으로 기록하는데 랙 앞에서 필요한 건 "한쪽에 뭘 몇 장"이다.
// 여기서 확인하는 것 셋:
//  ① 무게를 정하는 그 자리(운동모드·계획 편집)에 원판 구성이 보인다
//  ② 원판을 안 쓰는 기구(덤벨·머신)에서는 아예 안 보인다 — 성립하지 않는 계산이다
//  ③ 봉 무게를 바꾸면 구성이 다시 계산되고, 그 선택이 기구별로 남는다

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

/** 오늘을 0일차(하체)로 만들고 본운동 하나만 남긴다. */
async function seedLowerDay(
  email: string,
  ex: { exerciseId: string; equipment: string; weightKg: number },
) {
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
     values (${uid}, 0, 'lower', 0, $2, $3, 5, 6, $4::numeric)`,
    [email, ex.exerciseId, ex.equipment, ex.weightKg],
  );
}

async function startWorkout(page: import("@playwright/test").Page) {
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);
}

test("운동모드에서 바벨 100kg → 한쪽 20×2 로 알려준다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedLowerDay(email, {
    exerciseId: "squat",
    equipment: "barbell",
    weightKg: 100,
  });

  await startWorkout(page);

  const hint = page.getByTestId("plate-hint");
  await expect(hint).toBeVisible({ timeout: 8000 });
  // 20kg 봉 + 한쪽 40kg = 20 두 장. (25+15 가 아니라 — 실제로 사람이 끼우는 구성)
  await expect(hint).toHaveAttribute("data-bar-kg", "20");
  await expect(hint).toHaveAttribute("data-per-side", "20,20");
  await expect(hint).toContainText("한쪽 20×2");
});

test("무게를 바꾸면 원판 구성이 따라 바뀐다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedLowerDay(email, {
    exerciseId: "squat",
    equipment: "barbell",
    weightKg: 100,
  });

  await startWorkout(page);
  const hint = page.getByTestId("plate-hint");
  await expect(hint).toBeVisible({ timeout: 8000 });

  // 바벨 증량 단위는 5kg — 한 번 올리면 105kg → 한쪽 42.5 → 20+20+2.5
  await page.getByRole("button", { name: "무게 늘리기" }).click();
  await expect(hint).toHaveAttribute("data-per-side", "20,20,2.5");
});

test("봉 무게를 바꾸면 다시 계산하고, 그 선택이 유지된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedLowerDay(email, {
    exerciseId: "squat",
    equipment: "barbell",
    weightKg: 100,
  });

  await startWorkout(page);
  const hint = page.getByTestId("plate-hint");
  await expect(hint).toBeVisible({ timeout: 8000 });
  await expect(hint).toHaveAttribute("data-bar-kg", "20");

  // 20 → 15kg 봉: 한쪽 42.5 → 20+20+2.5
  await hint.getByRole("button", { name: /봉 무게 바꾸기/ }).click();
  await expect(hint).toHaveAttribute("data-bar-kg", "15");
  await expect(hint).toHaveAttribute("data-per-side", "20,20,2.5");

  // 새로고침 후 운동모드로 다시 들어와도 고른 봉 무게가 남아 있어야 한다
  // — 매번 다시 고르게 하면 있으나 마나다.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  // 세션이 살아 있으므로 '운동 시작' 이 아니라 '다시 운동하기' 로 들어간다.
  await page.getByRole("button", { name: "다시 운동하기" }).click();
  await expect(page.getByTestId("plate-hint")).toHaveAttribute("data-bar-kg", "15", {
    timeout: 10000,
  });
});

test("덤벨 운동에는 원판 안내를 안 붙인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedLowerDay(email, {
    exerciseId: "goblet-squat",
    equipment: "dumbbell",
    weightKg: 24,
  });

  await startWorkout(page);
  // 운동모드 자체는 정상이지만(무게 스크러버는 뜬다) 원판 칸은 없다.
  await expect(page.getByRole("slider", { name: "무게" })).toBeVisible({
    timeout: 8000,
  });
  await expect(page.getByTestId("plate-hint")).toHaveCount(0);
});

test("계획 편집(무게 고정 모드)에서도 원판 구성이 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedLowerDay(email, {
    exerciseId: "squat",
    equipment: "barbell",
    weightKg: 60,
  });
  await dbQuery(
    `update public.profiles set lock_weight_reps=true where user_id=${uid}`,
    [email],
  );

  await page.goto("/plan", { waitUntil: "networkidle" });

  const hint = page.getByTestId("plate-hint").first();
  await expect(hint).toBeVisible({ timeout: 10000 });
  await expect(hint).toHaveAttribute("data-per-side", "20");

  // 입력란을 고치면 안내도 같이 바뀐다.
  await page.getByLabel("무게(kg)").first().fill("61");
  await expect(hint).toContainText("1kg 는 원판으로 못 맞춰요");
});
