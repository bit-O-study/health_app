import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 주간 통합 리포트(로드맵 2.3) — 홈의 '이번 주 요약' 카드.
//
// 핵심은 비교 기준이다. 진행 중인 주를 끝난 주와 통째로 견주면 화요일엔 늘 폭락으로
// 보인다. 그래서 지난주도 **같은 요일까지** 잘라서 비교한다 — 그 규칙이 화면에
// 실제로 반영되는지 본다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
/** 서울 기준 이번 주 월요일. */
const monday = `((now() at time zone 'Asia/Seoul')::date
  - ((extract(isodow from (now() at time zone 'Asia/Seoul')::date)::int - 1)))`;

async function seedCompletion(
  email: string,
  dateSql: string,
  exerciseId: string,
  sets: number,
  reps: number,
  weightKg: number,
) {
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus, sets, reps, weight_kg)
     values (${uid}, ${dateSql}, gen_random_uuid(), 'done', $2, 'barbell', 'lower', $3::int, $4::int, $5::numeric)`,
    [email, exerciseId, sets, reps, weightKg],
  );
}

test("이번 주 요약 카드가 운동·볼륨·부위 분포를 보여준다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 이번 주 월요일에 스쿼트(하체 2,500kg), 오늘 벤치프레스(가슴 2,400kg).
  await seedCompletion(email, monday, "squat", 5, 5, 100);
  await seedCompletion(
    email,
    `(now() at time zone 'Asia/Seoul')::date`,
    "bench-press",
    4,
    10,
    60,
  );
  await dbQuery(
    `insert into public.workout_sessions (user_id, for_date, duration_sec)
     values (${uid}, ${monday}, 2700)
     on conflict (user_id, for_date) do update set duration_sec = 2700`,
    [email],
  );

  await page.goto("/home", { waitUntil: "networkidle" });
  const card = page.locator("section", { hasText: "이번 주 요약" }).first();
  await expect(card).toBeVisible({ timeout: 10_000 });

  // exact — 변화 배지("+4,900kg신규")에도 같은 숫자가 들어간다.
  await expect(card.getByText("4,900kg", { exact: true })).toBeVisible();
  await expect(card.getByText("45분", { exact: true })).toBeVisible();
  // 부위 분포 — 하체가 가슴보다 앞(볼륨 순).
  await expect(card.getByText(/하체 51%/)).toBeVisible();
  await expect(card.getByText(/가슴 49%/)).toBeVisible();
});

test("진행 중인 주는 지난주 '같은 요일까지'와 비교한다고 알려준다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedCompletion(email, monday, "squat", 5, 5, 100);

  await page.goto("/home", { waitUntil: "networkidle" });
  const card = page.locator("section", { hasText: "이번 주 요약" }).first();
  await expect(card).toBeVisible({ timeout: 10_000 });

  // 일요일이면 주가 끝나 전체 비교, 그 외에는 같은 요일까지 비교.
  const [row] = await dbQuery<{ dow: string }>(
    `select extract(isodow from (now() at time zone 'Asia/Seoul')::date)::text as dow`,
  );
  if (row.dow === "7") {
    await expect(card.getByText(/한 주 전체 · 지난주와 비교/)).toBeVisible();
  } else {
    await expect(card.getByText(/지난주 같은 요일까지와 비교/)).toBeVisible();
  }
});

test("지난주 기록이 없으면 '신규'로 표시한다 — 0에서 늘어난 건 몇 %라고 못 한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedCompletion(email, monday, "squat", 5, 5, 100);

  await page.goto("/home", { waitUntil: "networkidle" });
  const card = page.locator("section", { hasText: "이번 주 요약" }).first();
  await expect(card.getByText("신규").first()).toBeVisible({ timeout: 10_000 });
});

test("기록이 하나도 없으면 카드를 띄우지 않는다 — 홈이 0으로 도배되면 안 된다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/home", { waitUntil: "networkidle" });
  await expect(page.getByText("이번 주 요약")).toHaveCount(0);
});
