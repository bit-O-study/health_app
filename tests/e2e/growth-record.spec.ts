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

test("개인 기록 갱신과 증량 추천이 근거와 함께 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  // 목표 횟수는 경력에 따라 달라진다 — 추천을 확정적으로 보려면 경력을 고정한다.
  // 상급자 + heavy 종목이면 목표 6회.
  await dbQuery(
    `update public.profiles set experience='advanced' where user_id=${uid}`,
    [email],
  );

  // 지난주 100kg → 이번주 105kg, 둘 다 목표(6회)를 채웠다 → 다음은 한 단계(+5kg) 위.
  await seedCompletion(email, {
    daysAgo: 7,
    exerciseId: "squat",
    sets: 5,
    reps: 6,
    weightKg: 100,
  });
  await seedCompletion(email, {
    daysAgo: 0,
    exerciseId: "squat",
    sets: 5,
    reps: 6,
    weightKg: 105,
  });

  await page.goto("/settings/progress", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: /최근 30일 새 기록/ }),
  ).toBeVisible({ timeout: 8000 });
  // 추천은 '무엇을' 과 '왜' 가 같이 나와야 한다.
  await expect(page.getByText(/증량 · 110kg/)).toBeVisible();
  await expect(page.getByText(/목표\(6회\)를 채웠어요/)).toBeVisible();
  // 제안일 뿐이라는 안내.
  await expect(page.getByText(/그대로 따르지 않아도 됩니다/)).toBeVisible();
  // 최근 이력이 날짜별로 보인다.
  await expect(page.getByText("105kg × 6 × 5세트").first()).toBeVisible();
});

test("정체하면 디로드를 권한다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await dbQuery(
    `update public.profiles set experience='advanced' where user_id=${uid}`,
    [email],
  );

  // 같은 무게·횟수로 네 번 — 최고치가 세 세션째 그대로다.
  for (const daysAgo of [21, 14, 7, 0]) {
    await seedCompletion(email, {
      daysAgo,
      exerciseId: "squat",
      sets: 5,
      reps: 6,
      weightKg: 100,
    });
  }

  await page.goto("/settings/progress", { waitUntil: "networkidle" });
  await expect(page.getByText(/디로드 · 90kg/)).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/최고치가 안 늘었어요/)).toBeVisible();
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
