import { expect, test, type Locator, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 회귀: "운동 순서 변경 → 오늘만 운동 바꾸기 → 오늘만 부위 추가" 후에도 바꾼 순서가
// 그대로여야 한다.
//
// 원인이었던 것: '부위 추가'는 오늘 루틴을 daily_plan 으로 고정(pin)하는데, 그때 부위별로
// position 을 0..n 으로 **다시 매겼다**. 부위 경계를 넘어 순서를 바꾸면 position 은 전역
// 0..N-1 (부위끼리 안 겹침)로 저장되는데, 재인덱싱하면 부위마다 0 부터 겹쳐 화면 정렬
// (orderMainPlan)이 "기본 상태"로 판정하고 부위 그룹 순서로 되돌렸다 = 순서 초기화.
// 편집기(/plan/today) 저장도 부위별로 0..n 을 다시 매겨 같은 문제가 있었다.
//
// 드래그 조작 자체는 workout-reorder*.spec.ts 가 검증한다. 여기서는 그 결과 상태
// (전역 position 이 매겨진 routine_exercises)를 시드해, **그 뒤 흐름**만 검증한다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

// 드래그로 팔(해머컬)을 맨 위로 올린 뒤 reorderPlanAction 이 저장하는 상태 =
// 보이는 순서대로 전역 position 0..3.
const REORDERED = ["해머컬", "벤치프레스", "인클라인", "바이셉스 컬"];

const names = async (ul: Locator) =>
  (await ul.locator("li h3, li h4").allInnerTexts()).map((s) =>
    s.split("\n")[0].trim(),
  );

async function dismissNudge(page: Page) {
  for (const label of ["나중에", "다시는 안 보기", "닫기"]) {
    const btn = page.getByRole("button", { name: label });
    if (await btn.count()) await btn.first().click().catch(() => {});
    await page.waitForTimeout(150);
  }
}

/** 오늘 본운동 목록(부위 배지가 붙어 이름이 이어져 나오므로 startsWith 로 비교). */
async function mainOrder(page: Page): Promise<string[]> {
  const ul = page
    .locator("ul.space-y-2")
    .filter({ hasText: "벤치프레스" })
    .first();
  return names(ul);
}

const startsWithAll = (actual: string[], expected: string[]) =>
  actual.length >= expected.length &&
  expected.every((name, i) => actual[i]?.startsWith(name));

test("운동 순서를 바꾼 뒤 '오늘만 부위 추가'를 해도 순서가 초기화되지 않는다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 오늘 = 가슴 + 팔(멀티 부위) 루틴. 부위 경계를 넘는 재정렬이라야 재현된다.
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest","arm"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null,
            last_deferred_date=null, deferred_target=null,
            today_added_date=null, today_added_blocks=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [
    email,
  ]);
  await dbQuery(`delete from public.daily_plan where user_id=${uid}`, [email]);
  // position = 사용자가 부위 경계를 넘어 끌어 놓은 뒤의 전역 순서(해머컬이 맨 위).
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values
       (${uid}, 0, 'arm',   0, 'hammer-curl',   'dumbbell', 3, 10, 12),
       (${uid}, 0, 'chest', 1, 'bench-press',   'barbell',  3, 10, 40),
       (${uid}, 0, 'chest', 2, 'incline-press', 'barbell',  3, 10, 30),
       (${uid}, 0, 'arm',   3, 'biceps-curl',   'barbell',  3, 10, 20)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await dismissNudge(page);

  // 시작 상태: 바꿔 둔 순서 그대로 보인다.
  expect(
    startsWithAll(await mainOrder(page), REORDERED),
    "시드한 순서가 화면에 안 보임",
  ).toBe(true);

  // 오늘 부위 배지 → 액션 메뉴 → 오늘만 운동 바꾸기 시트 → 어깨 추가(= pin)
  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();
  await expect(
    page.getByRole("heading", { name: "오늘만 운동 바꾸기" }),
  ).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: "어깨 전체", exact: true }).click();
  await page.getByRole("button", { name: "오늘만 부위 추가" }).click();
  await expect(page).toHaveURL(/\/plan\/today.*add=1/, { timeout: 30000 });
  await page.waitForTimeout(1200);

  // pin 된 daily_plan 의 position 은 부위끼리 겹치지 않아야 한다(전역 순서 보존).
  const pinned = await dbQuery<{ focus: string; position: number }>(
    `select focus, position from public.daily_plan
      where user_id=${uid} and for_date=${today} order by position`,
    [email],
  );
  expect(pinned.length).toBe(4);
  expect(new Set(pinned.map((p) => Number(p.position))).size).toBe(4);

  // 오늘 화면 순서가 그대로여야 한다(초기화 X).
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await dismissNudge(page);
  expect(
    startsWithAll(await mainOrder(page), REORDERED),
    "부위 추가(pin) 후 순서가 초기화됨",
  ).toBe(true);

  // 편집기에서 '저장'까지 해도(부위별로 나눠 저장) 순서가 유지돼야 한다.
  await page.goto("/plan/today?focus=shoulder&add=1", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1000);
  // 저장 버튼은 본운동/워밍업/마무리 각각 있다 — 첫 번째(본운동)만.
  await page
    .getByRole("button", { name: "저장", exact: true })
    .first()
    .click();
  await expect(page.getByText("저장됨").first()).toBeVisible({
    timeout: 20000,
  });

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await dismissNudge(page);
  expect(
    startsWithAll(await mainOrder(page), REORDERED),
    "오늘만 편집기 저장 후 순서가 초기화됨",
  ).toBe(true);
});
