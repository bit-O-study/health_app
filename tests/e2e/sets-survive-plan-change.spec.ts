import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/** 알림/걸음수 넛지는 레이아웃을 흔들어 클릭을 방해한다 — 있으면 닫는다. */
async function dismissNudges(page: Page) {
  for (const name of ["나중에", "다시는 안 보기"]) {
    const b = page.getByRole("button", { name });
    if (await b.count()) await b.first().click().catch(() => {});
  }
  await page.waitForTimeout(300);
}

/**
 * 회귀: 운동 중 세트를 몇 개 완료한 뒤 "오늘만 부위 추가"를 하면 그 부위 행이 새로
 * 만들어지는데(행 id 변경), 세트 진행이 0으로 리셋돼 "완료한 세트가 다 없어졌다"고
 * 보였다. (부위:운동) 키로 이어받아 진행이 유지돼야 한다.
 */
const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test.describe.configure({ timeout: 180_000 });

test("세트 진행은 오늘만 부위 추가 후에도 유지된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
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
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [
    email,
  ]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [
    email,
  ]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await dismissNudges(page);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);

  const overlay = page.getByTestId("guided-scroll");
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toBeVisible({
    timeout: 8000,
  });
  await expect(page.getByText("세트 1/4")).toBeVisible();

  // 세트 2개 완료 → "세트 3/4"
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: /세트 완료 · 휴식/ }).click();
    await page.waitForTimeout(600);
  }
  await expect(page.getByText("세트 3/4")).toBeVisible();

  // 운동모드 닫고 "오늘만 부위 추가"(가슴) — 하체 행이 daily_plan 으로 새로 생긴다.
  await page.getByRole("button", { name: "닫기" }).first().click();
  // "운동 중단할까요?" 확인 → 중단
  await page.getByRole("button", { name: "중단", exact: true }).click();
  await page.waitForTimeout(800);
  await dismissNudges(page);
  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();
  await page.getByRole("button", { name: "가슴 전체" }).click();
  await page.getByRole("button", { name: "오늘만 부위 추가" }).click();
  await expect(page).toHaveURL(/\/plan\/today/, { timeout: 30_000 });
  await page.waitForTimeout(1000);

  // 행 id 가 실제로 바뀌었는지(= 회귀 조건 성립) 확인.
  const pinned = await dbQuery<{ n: string }>(
    `select count(*)::text n from public.daily_plan
      where user_id=${uid} and for_date=${today} and focus='lower'`,
    [email],
  );
  expect(Number(pinned[0].n)).toBeGreaterThan(0);

  // 다시 운동모드 — 세트 진행이 그대로 3/4 여야 한다(0으로 리셋되면 버그).
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await dismissNudges(page);
  // 이미 한 번 시작한 날이라 버튼 문구가 "다시 운동하기" 일 수 있다.
  await page
    .getByRole("button", { name: "운동 시작" })
    .or(page.getByRole("button", { name: "다시 운동하기" }))
    .first()
    .click();
  await page.waitForTimeout(1200);
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toBeVisible({
    timeout: 8000,
  });
  await expect(page.getByText("세트 3/4")).toBeVisible({ timeout: 8000 });
});
