import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 같은 부위(하체)가 두 일차(수·목)에 있을 때, 한 일차에서 운동을 삭제해도
// 다른 일차는 그대로여야 한다. (사용자 보고: 수요일 하체에서 레그프레스 삭제 시
// 목요일 하체에 영향)

type Row = { day_index: number; n: string };
async function lowerCounts(email: string): Promise<Map<number, number>> {
  const rows = await dbQuery<Row>(
    `select day_index, count(*)::text as n
       from public.routine_exercises
      where user_id = (select id from auth.users where lower(email)=lower($1))
        and focus = 'lower'
      group by day_index order by day_index`,
    [email],
  );
  return new Map(rows.map((r) => [r.day_index, Number(r.n)]));
}

test("같은 부위 두 일차 — 한 일차 운동 삭제가 다른 일차에 영향 없음", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 커스텀: 2일차(3일=수 모사)·3일차(4일=목) 모두 하체.
  const week = [
    ["chest"],
    ["back"],
    ["lower"],
    ["lower"],
    ["rest"],
    ["rest"],
    ["rest"],
  ];
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom', custom_week=$2::jsonb,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            rest_date=null, override_date=null, override_block=null
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email, JSON.stringify(week)],
  );
  await seedRecommendedExercises(page);

  const before = await lowerCounts(email);
  expect(before.get(2)).toBeGreaterThan(1);
  expect(before.get(3)).toBeGreaterThan(1);

  // /plan 에서 "3일 · 하체"(2일차) 섹션에서만 운동 1개 삭제 후 저장.
  await page.goto("/plan", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const day3 = page.locator('[data-plan-day-index="2"]');
  await expect(day3).toHaveCount(1);
  // 본운동 행만(워밍업/마무리 제외) — 통합 편집기의 안정적인 행 testid로 센다.
  const exerciseRows = day3.locator('[data-testid^="plan-row-2:lower-"]');
  const rowsBefore = await exerciseRows.count();
  expect(rowsBefore).toBe(before.get(2));
  // 2일차 lower 의 본운동 삭제 버튼(전용 testid)으로 첫 행 삭제.
  await day3.locator('[data-testid^="delete-row-2:lower-"]').first().click();
  await expect(exerciseRows).toHaveCount(rowsBefore - 1);
  // 섹션엔 본운동/워밍업/마무리 '저장'이 있어 첫 번째(본운동) 저장을 누른다.
  await day3.getByRole("button", { name: "3일차 저장" }).click();
  await expect(page.getByText("3일차 저장됨")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(500);

  // 2일차는 1개 줄고, 3일차는 그대로여야 한다(일차별 독립).
  const after = await lowerCounts(email);
  expect(after.get(2)).toBe((before.get(2) ?? 0) - 1);
  expect(after.get(3)).toBe(before.get(3));
});
