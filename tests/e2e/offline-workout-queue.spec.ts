import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 헬스장은 지하가 많다 — 신호가 끊긴 채 세트를 쳐도 기록이 사라지면 안 된다.
 *
 * 예전 동작: 서버 액션이 실패하면 빨간 "저장 실패 — 다시 시도" 배너가 뜨고, 그 기록은
 * **운동모드 화면의 메모리에만** 남았다. 화면을 벗어나거나 앱이 죽으면 그대로 증발.
 * 지금: 오프라인이면 기기에 담아 두고(주황 대기 배너), 연결되면 자동으로 올린다.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function seedLowerDay(email: string) {
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
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60),
            (${uid}, 0, 'lower', 1, 'leg-press', 'machine', 4, 10, 100)`,
    [email],
  );
}

test("오프라인에서 친 세트는 기기에 남고, 연결되면 알아서 올라간다", async ({
  page,
  context,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedLowerDay(email);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);

  // ── 지하로 내려간다 ────────────────────────────────────────────────
  await context.setOffline(true);
  await page.getByRole("button", { name: "운동 완료", exact: true }).click();

  // 🔴 빨간 '저장 실패 — 다시 시도' 가 **뜨면 안 된다.** 사용자가 할 수 있는 게
  //   없는데 재시도 버튼을 띄우면 연결이 돌아올 때까지 헛손질만 하게 된다.
  await expect(page.getByTestId("offline-waiting")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("저장 실패")).toHaveCount(0);
  await expect(page.getByTestId("offline-waiting")).toContainText("스쿼트");

  // 아직 서버엔 아무것도 없다 — 화면만 앞서 간 게 아니라 정말 큐에 있는 상태.
  const before = await dbQuery<{ n: string }>(
    `select count(*)::text as n from public.exercise_completions
      where user_id=${uid} and for_date=${today}`,
    [email],
  );
  expect(before[0].n).toBe("0");

  // 기기에 실제로 적혀 있는지(앱이 죽어도 살아남는 자리) 확인.
  const stored = await page.evaluate(() =>
    window.localStorage.getItem("helssu:pending-writes:v1"),
  );
  expect(stored).toContain("squat");

  // ── 지상으로 올라온다 ──────────────────────────────────────────────
  await context.setOffline(false);

  // 자동으로 올라가야 한다 — 사용자가 아무것도 안 눌러도.
  await expect
    .poll(
      async () => {
        const rows = await dbQuery<{ exercise_id: string }>(
          `select exercise_id from public.exercise_completions
            where user_id=${uid} and for_date=${today} and status='done'`,
          [email],
        );
        return rows.map((r) => r.exercise_id);
      },
      { timeout: 30000, message: "연결 복구 후 대기 기록이 자동으로 올라가야 한다" },
    )
    .toContain("squat");

  // 다 올라갔으면 배너는 사라지고 기기의 큐도 비어야 한다(두 번 올리지 않게).
  await expect(page.getByTestId("offline-waiting")).toHaveCount(0);
  await expect
    .poll(
      async () =>
        await page.evaluate(() =>
          window.localStorage.getItem("helssu:pending-writes:v1"),
        ),
      { timeout: 10000 },
    )
    .toBeNull();
});

test("오프라인에서 담은 기록은 화면을 벗어나도 살아남는다", async ({
  page,
  context,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedLowerDay(email);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);

  await context.setOffline(true);
  await page.getByRole("button", { name: "운동 완료", exact: true }).click();
  await expect(page.getByTestId("offline-waiting")).toBeVisible({ timeout: 10000 });

  // 🔴 여기가 예전에 기록이 사라지던 자리다 — 운동모드를 벗어나면 실패 목록이
  //   그 컴포넌트와 함께 통째로 없어졌다. 이제 큐는 화면 밖에 있다.
  await context.setOffline(false);
  await page.goto("/", { waitUntil: "networkidle" });

  await expect
    .poll(
      async () => {
        const rows = await dbQuery<{ exercise_id: string }>(
          `select exercise_id from public.exercise_completions
            where user_id=${uid} and for_date=${today} and status='done'`,
          [email],
        );
        return rows.map((r) => r.exercise_id);
      },
      { timeout: 30000, message: "다른 화면으로 옮겨도 대기 기록은 올라가야 한다" },
    )
    .toContain("squat");
});
