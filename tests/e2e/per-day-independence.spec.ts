import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 일차별 독립: 같은 부위(push)가 1일차·4일차에 모두 나오는 PPL×2 루틴에서,
// 한 일차의 운동을 편집/삭제해도 다른 일차는 그대로여야 한다.
// (과거엔 부위 단위로 공유돼 한쪽을 고치면 다른 날도 바뀌던 버그)

type Row = { day_index: number; n: string };

async function pushCounts(email: string): Promise<Map<number, number>> {
  const rows = await dbQuery<Row>(
    `select day_index, count(*)::text as n
       from public.routine_exercises
      where user_id = (select id from auth.users where lower(email)=lower($1))
        and focus = 'push'
      group by day_index order by day_index`,
    [email],
  );
  return new Map(rows.map((r) => [r.day_index, Number(r.n)]));
}

test("같은 부위가 두 일차에 있어도 한 일차 편집이 다른 일차에 안 샌다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 루틴을 PPL×2(ppl-6) 로 — push 가 0일차·3일차 두 번. 기준일=오늘(0일차=push).
  await dbQuery(
    `update public.user_routines
        set splits=6, variant_id='ppl-6', custom_week=null,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            rest_date=null, override_date=null, override_block=null
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email],
  );

  // 추천으로 등록 → 일차별로 시드된다.
  await seedRecommendedExercises(page);

  // push 가 0일차·3일차에 독립 시드됐는지(각각 행이 있고 개수 동일)
  const before = await pushCounts(email);
  expect(before.get(0)).toBeGreaterThan(0);
  expect(before.get(3)).toBeGreaterThan(0);
  expect(before.get(0)).toBe(before.get(3));

  // /plan 에서 "4일 · 밀기"(3일차) 섹션에만 운동 1개 추가 후 저장.
  await page.goto("/plan", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const day4 = page.locator("section").filter({
    has: page.getByRole("heading", { level: 3, name: /4일 · 밀기/ }),
  });
  await expect(day4).toHaveCount(1);
  const exSelects = day4.getByRole("combobox", { name: "운동" });
  const rowsBefore = await exSelects.count();
  expect(rowsBefore).toBeGreaterThan(1);
  await day4.getByRole("button", { name: "운동 추가" }).click();
  // 추가가 React 상태에 반영(행 1개 증가)된 뒤에 저장 — 클릭 경쟁 방지
  await expect(exSelects).toHaveCount(rowsBefore + 1);
  await day4.getByRole("button", { name: "저장", exact: true }).click();
  // 서버 액션 완료(저장됨 상태 메시지) 후에 DB 확인
  await expect(page.getByText("저장됨")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(500);

  // 3일차는 1개 늘고, 0일차는 그대로여야 한다(일차별 독립).
  const after = await pushCounts(email);
  expect(after.get(3)).toBe((before.get(3) ?? 0) + 1);
  expect(after.get(0)).toBe(before.get(0));
});

// 마이그레이션 백필: day_index 없는 기존(legacy) 행이 있는 사용자가 앱에 들어오면
// 현재 루틴에 맞춰 일차별로 자동 배치되어야 한다. 같은 부위가 여러 일차를 쓰면 복제.
test("legacy(day_index NULL) 행이 일차별로 자동 백필된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // PPL×2(ppl-6) — push 가 0일차·3일차 두 번.
  await dbQuery(
    `update public.user_routines
        set splits=6, variant_id='ppl-6', custom_week=null,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            rest_date=null, override_date=null, override_block=null
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email],
  );
  await seedRecommendedExercises(page);

  // 과거 상태를 모사: push 를 한 벌(day_index NULL)만 남긴다(부위 단위 공유 시절).
  await dbQuery(
    `delete from public.routine_exercises
      where user_id=(select id from auth.users where lower(email)=lower($1))
        and focus='push' and day_index <> 0`,
    [email],
  );
  await dbQuery(
    `update public.routine_exercises set day_index = null
      where user_id=(select id from auth.users where lower(email)=lower($1))
        and focus='push'`,
    [email],
  );
  // 백필 전: push 행이 모두 day_index NULL 이어야 한다(일차 배정 전 상태)
  const legacyNulls = await dbQuery<{ n: string }>(
    `select count(*)::text as n from public.routine_exercises
      where user_id=(select id from auth.users where lower(email)=lower($1))
        and focus='push' and day_index is null`,
    [email],
  );
  expect(Number(legacyNulls[0].n)).toBeGreaterThan(0);

  // /plan 진입 → ensureDayIndexBackfilled 가 돈다.
  await page.goto("/plan", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // NULL 이 사라지고 push 가 0일차·3일차로 복제됐는지
  const nulls = await dbQuery<{ n: string }>(
    `select count(*)::text as n from public.routine_exercises
      where user_id=(select id from auth.users where lower(email)=lower($1))
        and day_index is null`,
    [email],
  );
  expect(Number(nulls[0].n)).toBe(0);
  const filled = await pushCounts(email);
  expect(filled.get(0)).toBeGreaterThan(0);
  expect(filled.get(3)).toBe(filled.get(0));
});
