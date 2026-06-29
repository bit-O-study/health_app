import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// '오늘만 변경'(daily_plan 오버라이드) 상태에서 하단 '다가오는 7일' 순서를 바꾸려 하면
// 순서변경은 막고 "오늘만 상태에서 벗어나겠습니까?" 확인을 받는다.
//  - 아니오: 아무것도 안 바뀐다(오늘만 상태 유지).
//  - 예: 오늘만 상태만 해제(daily_plan 비움, 오늘=원래 루틴). 순서변경은 아직 미적용.
//        해제 후 다시 드래그하면 그때 순서변경이 반영된다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function dragCard(page: Page, from: number, to: number) {
  const src = page.locator(`[data-day-index="${from}"]`);
  const dst = page.locator(`[data-day-index="${to}"]`);
  await src.scrollIntoViewIfNeeded();
  const a = await src.boundingBox();
  const b = await dst.boundingBox();
  if (!a || !b) throw new Error("카드 위치를 찾지 못함");
  const sx = a.x + a.width / 2;
  const sy = a.y + a.height / 2;
  const tx = b.x + b.width / 2;
  const ty = b.y + b.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.waitForTimeout(100);
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(sx + ((tx - sx) * i) / 12, sy + ((ty - sy) * i) / 12, {
      steps: 2,
    });
    await page.waitForTimeout(35);
  }
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(400);
}

/** 0·1일차 하체 + 오늘 daily_plan 오버라이드('오늘만 변경' 상태)로 세팅 후 /routine. */
async function setupTodayOnly(page: Page): Promise<string> {
  const email = await signUpAndOnboard(page);
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["lower"],["lower"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 0, 'lower', 0, 'rdl', 'barbell', 4, 8, 60),
       (${uid}, 1, 'lower', 0, 'squat', 'barbell', 4, 8, 60),
       (${uid}, 1, 'lower', 1, 'leg-press', 'machine', 4, 10, 100)`,
    [email],
  );
  // 오늘만 변경 상태 — 오늘 daily_plan 오버라이드
  await dbQuery(
    `insert into public.daily_plan
       (user_id, for_date, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, ${today}, 'lower', 0, 'rdl', 'barbell', 4, 8, 60)`,
    [email],
  );
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  return email;
}

test("오늘만 상태 + 7일 순서변경 → '벗어나기' 확인, '아니오'면 그대로", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await setupTodayOnly(page);

  await page.getByRole("button", { name: "편집하기" }).click();
  await dragCard(page, 0, 1);

  await expect(page.getByText("오늘만 상태에서 벗어나겠습니까?")).toBeVisible();
  await page.getByRole("button", { name: "아니오" }).click();
  await page.waitForTimeout(500);

  // daily_plan(오늘) 유지 + 0일차 본운동 그대로 rdl
  const dp = await dbQuery<{ n: string }>(
    `select count(*)::text n from public.daily_plan where user_id=${uid} and for_date=${today}`,
    [email],
  );
  expect(dp[0].n).toBe("1");
  const d0 = await dbQuery<{ exercise_id: string }>(
    `select exercise_id from public.routine_exercises
       where user_id=${uid} and day_index=0 and focus='lower' order by position`,
    [email],
  );
  expect(d0.map((r) => r.exercise_id)).toEqual(["rdl"]);
});

test("오늘만 상태 + 7일 순서변경 → '예'면 오늘만 해제만(순서 그대로), 다시 드래그하면 변경", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await setupTodayOnly(page);

  await page.getByRole("button", { name: "편집하기" }).click();
  await dragCard(page, 0, 1);

  await expect(page.getByText("오늘만 상태에서 벗어나겠습니까?")).toBeVisible();
  await page.getByRole("button", { name: "예, 오늘만 해제" }).click();
  await page.waitForTimeout(1500);

  // 오늘만 상태 해제: daily_plan(오늘) 비워짐. 하지만 순서변경은 아직 미적용 → day0=rdl 그대로
  const dpAfterExit = await dbQuery<{ n: string }>(
    `select count(*)::text n from public.daily_plan where user_id=${uid} and for_date=${today}`,
    [email],
  );
  expect(dpAfterExit[0].n).toBe("0");
  const d0AfterExit = await dbQuery<{ exercise_id: string }>(
    `select exercise_id from public.routine_exercises
       where user_id=${uid} and day_index=0 and focus='lower' order by position`,
    [email],
  );
  expect(d0AfterExit.map((r) => r.exercise_id)).toEqual(["rdl"]);

  // 해제 후 일반 상태 — 다시 드래그하면 모달 없이 순서변경이 반영된다.
  // (해제 후 편집 상태가 남을 수 있어 페이지를 새로 로드해 결정적으로 만든다.)
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "편집하기" }).click();
  await dragCard(page, 0, 1);
  await page.waitForTimeout(1500);

  const d0 = await dbQuery<{ exercise_id: string }>(
    `select exercise_id from public.routine_exercises
       where user_id=${uid} and day_index=0 and focus='lower' order by position`,
    [email],
  );
  expect(d0.map((r) => r.exercise_id)).toEqual(["squat", "leg-press"]);
});
