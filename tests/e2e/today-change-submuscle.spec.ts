import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 원칙 #1: '오늘만 운동 바꾸기'에서 고를 수 있는 부위가 루틴 편집기와 동일해야 한다 —
// 세부근육 블록(가슴 상부 등)까지 고를 수 있어야 한다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function dismissNudge(page: Page) {
  for (const label of ["나중에", "다시는 안 보기", "닫기"]) {
    const b = page.getByRole("button", { name: label });
    if (await b.count()) await b.first().click().catch(() => {});
    await page.waitForTimeout(150);
  }
}

test("오늘만 운동 바꾸기에서 세부근육(가슴 상부)까지 고르고 편집할 수 있다(원칙#1)", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null,
            last_deferred_date=null, deferred_target=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.daily_plan where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'chest', 0, 'bench-press', 'barbell', 4, 8, 60)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await dismissNudge(page);

  // 부위 배지 → 오늘만 운동 바꾸기 시트
  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();
  await expect(
    page.getByRole("heading", { name: "오늘만 운동 바꾸기" }),
  ).toBeVisible({ timeout: 8000 });

  // 세부근육 칩(가슴 상부)이 보여야 한다 — 루틴 편집기와 동일한 선택지(원칙#1).
  const subChip = page.getByRole("button", { name: "가슴 상부", exact: true });
  await expect(subChip).toBeVisible();

  // 가슴 상부 선택 → 오늘만 부위 추가 → /plan/today
  await subChip.click();
  await page.getByRole("button", { name: "오늘만 부위 추가" }).click();
  await expect(page).toHaveURL(/\/plan\/today.*add=1/, { timeout: 30000 });
  await page.waitForTimeout(1000);

  // 섹션 제목은 사용자 요청대로 큰 부위명("가슴")만 표시한다. 대신 선택 목록이
  // 상부 전용 운동으로 좁혀져야 세부근육 blockId가 편집기까지 흘러온 것이다.
  await page.getByRole("button", { name: "운동", exact: true }).first().click();
  await expect(page.getByText("인클라인 프레스", { exact: true })).toBeVisible({
    timeout: 8000,
  });
});
