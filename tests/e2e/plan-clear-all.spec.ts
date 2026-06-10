import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// "전체 운동 초기화" 는 저장을 누르지 않아도 본운동 + 워밍업/마무리를 즉시 비운다.

test("전체 운동 초기화: 저장 없이 본운동·워밍업·마무리 즉시 삭제", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  // 본운동 1개 + 워밍업 1개 + 마무리 1개 시드
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'chest', 0, 'bench-press', 'barbell', 3, 10, 40)`,
    [email],
  );
  await dbQuery(
    `insert into public.routine_conditioning
       (user_id, focus, kind, position, item_id, duration_min)
     values (${uid}, 'chest', 'warmup', 0, 'running', 5),
            (${uid}, 'chest', 'cooldown', 0, 'child-pose', 1)`,
    [email],
  );

  await page.goto("/plan", { waitUntil: "networkidle" });

  // 전체 초기화 → 확인 다이얼로그의 '전체 비우기' (저장 누르지 않음)
  await page.getByTestId("clear-all-exercises").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "전체 비우기" })
    .click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  // DB: 본운동·컨디셔닝 모두 0 (저장 안 눌렀어도 즉시 반영)
  const ex = await dbQuery<{ n: string }>(
    `select count(*)::text n from public.routine_exercises where user_id=${uid}`,
    [email],
  );
  const cond = await dbQuery<{ n: string }>(
    `select count(*)::text n from public.routine_conditioning where user_id=${uid}`,
    [email],
  );
  expect(Number(ex[0].n)).toBe(0);
  expect(Number(cond[0].n)).toBe(0);
});
