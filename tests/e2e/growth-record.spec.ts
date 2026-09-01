import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 운동별 성장 기록(로드맵 2.1) — 성장 그래프가 실제 기록을 **정확히** 반영하는지.
//
// 특히 세트별 기록(드롭세트·피라미드). 이 앱은 세트마다 다른 무게를 set_details 에
// 저장하는데, 예전 집계는 그걸 안 읽고 균일 세트(sets×reps@weight)로만 계산했다.
// 화면에 나오는 숫자로 그 차이를 확인한다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

/** 완료 기록을 직접 넣는다 — 화면 조작 없이 집계만 보려는 목적. */
async function seedCompletion(
  email: string,
  opts: {
    daysAgo: number;
    exerciseId: string;
    sets: number;
    reps: number;
    weightKg: number;
    setDetails?: { weightKg: number | null; reps: number }[];
  },
) {
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus, sets, reps, weight_kg, set_details)
     values (${uid}, ${today} - $2::int, gen_random_uuid(), 'done', $3, 'barbell', 'lower', $4::int, $5::int, $6::numeric, $7::jsonb)`,
    [
      email,
      opts.daysAgo,
      opts.exerciseId,
      opts.sets,
      opts.reps,
      opts.weightKg,
      opts.setDetails ? JSON.stringify(opts.setDetails) : null,
    ],
  );
}

test("세트별 기록(드롭세트)이 볼륨·1RM 에 그대로 반영된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 60×10 + 50×10 + 40×12 = 1,580kg. 균일 세트로 세면 3×10×60 = 1,800kg 이 된다.
  await seedCompletion(email, {
    daysAgo: 0,
    exerciseId: "squat",
    sets: 3,
    reps: 10,
    weightKg: 60,
    setDetails: [
      { weightKg: 60, reps: 10 },
      { weightKg: 50, reps: 10 },
      { weightKg: 40, reps: 12 },
    ],
  });

  await page.goto("/settings/progress", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "성장 그래프" })).toBeVisible();
  // 누적 볼륨이 세트별 합계와 같아야 한다 — 1,800 이면 옛 계산으로 되돌아간 것.
  await expect(page.getByText(/누적 1,580kg/)).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/누적 1,800kg/)).toHaveCount(0);
  // 1RM 은 가장 무거운 세트 기준(60kg × 10회).
  await expect(page.getByText("스쿼트").first()).toBeVisible();
  await expect(page.getByText(/최고 추정 1RM/).first()).toBeVisible();
});

test("단측 운동은 볼륨을 양쪽으로 센다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 원암 덤벨로우 20kg × 10회 × 4세트 = 한쪽 800kg → 양쪽 1,600kg.
  await seedCompletion(email, {
    daysAgo: 0,
    exerciseId: "one-arm-dumbbell-row",
    sets: 4,
    reps: 10,
    weightKg: 20,
  });

  await page.goto("/settings/progress", { waitUntil: "networkidle" });
  await expect(page.getByText(/누적 1,600kg/)).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("한쪽 기준").first()).toBeVisible();
});

test("개인 기록 갱신과 다음 권장 중량이 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 지난주 100kg → 이번주 105kg. 떨어지지 않았으니 다음은 한 단계(+5kg) 위.
  await seedCompletion(email, {
    daysAgo: 7,
    exerciseId: "squat",
    sets: 5,
    reps: 5,
    weightKg: 100,
  });
  await seedCompletion(email, {
    daysAgo: 0,
    exerciseId: "squat",
    sets: 5,
    reps: 5,
    weightKg: 105,
  });

  await page.goto("/settings/progress", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: /최근 30일 새 기록/ }),
  ).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/다음 권장 110kg/)).toBeVisible();
  // 최근 이력이 날짜별로 보인다.
  await expect(page.getByText("105kg × 5 × 5세트").first()).toBeVisible();
});

test("기록이 없으면 빈 상태 안내만 보이고 터지지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/settings/progress", { waitUntil: "networkidle" });
  await expect(
    page.getByText("아직 중량 운동 완료 기록이 없어요"),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /새 기록/ })).toHaveCount(0);
});
