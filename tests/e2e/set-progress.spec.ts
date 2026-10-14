import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 세트 완료마다 기록한다(2026-10-14).
// 예전엔 마지막 세트까지 끝내야 기록이 생겨서, 4세트 중 몇 세트만 하고 넘기면 한 세트도 안 남았다.
// 세트 완료 → 진행 기록(partial), 세트 완료 취소 → 기록도 취소, 넘기기 → 한 만큼만 완료로 굳는다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

type Row = { status: string; sets: number; reps: number; w: number; sd: { weightKg: number; reps: number }[] | null };
const record = (email: string) =>
  dbQuery<Row>(
    `select status, sets, reps, weight_kg::float8 as w, set_details as sd
       from public.exercise_completions where user_id=${uid} and for_date=${today} and exercise_id='squat'`,
    [email],
  );

test("세트 완료마다 기록되고, 취소하면 기록도 줄고, 넘기면 한 만큼만 완료로 남는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(180_000);
  const email = await signUpAndOnboard(page);
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
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await expect(page.getByTestId("current-set")).toHaveText("세트 1/4", { timeout: 15_000 });
  const setDone = page.getByRole("button", { name: "세트 완료", exact: true });
  const restEnd = page.getByRole("button", { name: /휴식 끝내기/ });

  // 1세트 완료 → 바로 진행 기록 1세트(60kg × 8회).
  await setDone.click();
  await expect.poll(async () => (await record(email))[0] ?? null, { timeout: 20_000 }).toEqual({ status: "partial", sets: 1, reps: 8, w: 60, sd: null });

  // 2세트는 무게를 올려서 — 세트마다 한 값으로 남는다(예전엔 마지막 칸 값이 모든 세트에 적혔다).
  await restEnd.click();
  await page.getByRole("button", { name: "무게 늘리기" }).click();
  await setDone.click();
  await expect
    .poll(async () => (await record(email))[0] ?? null, { timeout: 20_000 })
    .toMatchObject({ status: "partial", sets: 2, sd: [{ weightKg: 60, reps: 8 }, { weightKg: 65, reps: 8 }] });

  // 세트 완료 취소 → 기록도 한 세트 줄어든다.
  await restEnd.click();
  // 개발 서버의 도구 버튼이 화면 구석에서 이 버튼을 가린다 — 누름 이벤트를 직접 보낸다.
  await page.getByRole("button", { name: "세트 완료 취소" }).dispatchEvent("click");
  await expect.poll(async () => (await record(email))[0] ?? null, { timeout: 20_000 }).toEqual({ status: "partial", sets: 1, reps: 8, w: 60, sd: null });

  // 한 번 더 취소 → 끝낸 세트가 없으니 기록 자체가 없어진다.
  // 개발 서버의 도구 버튼이 화면 구석에서 이 버튼을 가린다 — 누름 이벤트를 직접 보낸다.
  await page.getByRole("button", { name: "세트 완료 취소" }).dispatchEvent("click");
  await expect.poll(async () => (await record(email)).length, { timeout: 20_000 }).toBe(0);

  // 다시 1세트 하고 넘기면 — '건너뜀'이 아니라 1세트 완료로 남는다.
  await setDone.click();
  await expect.poll(async () => (await record(email))[0]?.sets ?? 0, { timeout: 20_000 }).toBe(1);
  await restEnd.click();
  await page.getByRole("button", { name: "넘기기" }).click();
  await expect
    .poll(async () => (await record(email))[0] ?? null, { timeout: 20_000 })
    .toMatchObject({ status: "done", sets: 1, w: 65 });
});
