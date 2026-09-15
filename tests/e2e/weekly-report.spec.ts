import { expect, test } from "@playwright/test";

import { createOnboardedAccount, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 주간 통합 리포트(로드맵 2.3) — 홈·운동탭의 '이번 주' 카드.
// 2026-09-14 요약·훈련 두 장을 한 장으로 합쳤고, 2026-09-15 "글씨가 너무 많아"로
// 비교 설명 문장·볼륨 비중 줄·'신규' 표시는 화면에서 뺐다(늘어난 양 "+4,900kg"만 남김).
// 비교 규칙(지난주 같은 요일까지)은 집계 로직 단위테스트(weekly-report)가 지킨다.

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

test("이번 주 카드가 운동한 날·시간·볼륨을 보여준다", async ({ page }) => {
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
  const card = page.getByTestId("weekly-report");
  await expect(card).toBeVisible({ timeout: 10_000 });

  await expect(card).toContainText("4,900kg");
  await expect(card).toContainText("45분");
});

test("지난주보다 늘어난 양을 숫자 옆에 + 로 보여준다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedCompletion(email, monday, "squat", 5, 5, 100);

  await page.goto("/home", { waitUntil: "networkidle" });
  const card = page.getByTestId("weekly-report");
  await expect(card).toBeVisible({ timeout: 10_000 });
  // 지난주 기록이 없으니 이번 주 볼륨 전체가 늘어난 양이다.
  await expect(card).toContainText("+2,500kg");
  // 설명 문장은 화면에 없다(간결화).
  await expect(card.getByText(/지난주 같은 요일까지와 비교/)).toHaveCount(0);
});

test("기록이 하나도 없으면 카드를 띄우지 않는다 — 홈이 0으로 도배되면 안 된다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await createOnboardedAccount(page);

  await page.goto("/home", { waitUntil: "networkidle" });
  await expect(page.getByTestId("weekly-report")).toHaveCount(0);
});

test("캘린더에는 '이번 주' 카드를 띄우지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await createOnboardedAccount(page);

  await page.goto("/calendar", { waitUntil: "networkidle" });
  await expect(page.getByTestId("weekly-report")).toHaveCount(0);
  await expect(page.getByText("이번 달 요약")).toBeVisible();
});
