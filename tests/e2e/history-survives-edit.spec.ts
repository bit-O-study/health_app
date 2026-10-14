import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 지난 기록은 오늘의 편집에 지워지거나 바뀌지 않는다(2026-10-14).
// 예전엔 ① 홈에서 운동을 지우면 그 운동의 지난 기록이 전부 지워졌고(루틴 행은 매주 같은 id),
// ② 오늘 세트·무게를 고치면 지난 기록까지 같은 값으로 덮였다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function seed(email: string) {
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["back"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true, rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'back', 0, 'lat-pulldown', 'machine', 3, 10, 40),
            (${uid}, 0, 'back', 1, 'barbell-row', 'barbell', 3, 10, 40)`,
    [email],
  );
  // 같은 루틴 행으로 지난주(40kg)와 오늘(45kg)에 랫풀다운을 했다.
  for (const [ago, kg] of [[7, 40], [0, 45]] as const) {
    await dbQuery(
      `insert into public.exercise_completions
         (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus, sets, reps, weight_kg)
       select user_id, ${today} - $2::int, id, 'done', 'lat-pulldown', 'machine', 'back', 3, 10, $3::numeric
         from public.routine_exercises where user_id=${uid} and exercise_id='lat-pulldown'`,
      [email, ago, kg],
    );
  }
}

const history = (email: string) =>
  dbQuery<{ ago: number; w: number; sets: number }>(
    `select (${today} - for_date)::int as ago, weight_kg::float8 as w, sets
       from public.exercise_completions where user_id=${uid} and exercise_id='lat-pulldown' order by for_date`,
    [email],
  );

test("홈에서 운동을 지워도 지난 기록은 남는다 — 오늘 기록만 빠진다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  await seed(email);
  expect((await history(email)).map((r) => r.ago)).toEqual([7, 0]);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "편집하기" }).click();
  await page.locator("li").filter({ hasText: "랫풀다운" }).first().getByRole("checkbox").check();
  await page.getByRole("button", { name: /삭제/ }).first().click();
  // 무엇이 사라지고 무엇이 남는지 말해 준다.
  await expect(page.getByRole("dialog")).toContainText("지난 기록은 그대로 남아요");
  await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();

  await expect.poll(async () => (await history(email)).map((r) => r.ago), { timeout: 15_000 }).toEqual([7]);
  expect((await history(email))[0]).toEqual({ ago: 7, w: 40, sets: 3 });
});

test("오늘 무게를 고쳐도 지난 기록은 그대로다 — 오늘 기록만 바뀐다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  await seed(email);
  // 목록에서 세트·무게를 고치는 칸은 '무게·횟수 고정'을 켰을 때 나온다.
  await dbQuery(`update public.profiles set lock_weight_reps=true where user_id=${uid}`, [email]);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "편집하기" }).click();
  const row = page.locator("li").filter({ hasText: "랫풀다운" }).first();
  await row.getByRole("button", { name: "수정" }).click();
  await row.getByLabel("무게(kg)").fill("60");
  await row.getByRole("button", { name: "저장" }).click();

  // 오늘 기록은 60kg, 지난주 기록은 40kg 그대로(예전엔 둘 다 60kg 이 됐다).
  await expect
    .poll(async () => (await history(email)).map((r) => [r.ago, r.w]), { timeout: 15_000 })
    .toEqual([[7, 40], [0, 60]]);
});
