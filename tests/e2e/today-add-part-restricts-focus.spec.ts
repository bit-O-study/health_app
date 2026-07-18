import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// #7: '오늘만 부위 추가'로 어깨를 추가하면, 편집기에서 담을 수 있는 부위는 '추가 요청한 부위
// (어깨)'로 제한돼야 한다 — 등/코어/하체 등 요청하지 않은 부위는 담을 수 없다.
// (기존 오늘 부위(가슴)는 그대로 보이되, 새 운동 추가/부위 전환은 가슴+어깨로만.)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function dismissNudge(page: Page) {
  for (const label of ["나중에", "다시는 안 보기", "닫기"]) {
    const b = page.getByRole("button", { name: label });
    if (await b.count()) await b.first().click().catch(() => {});
    await page.waitForTimeout(150);
  }
}

test("오늘만 부위 추가: 편집기 부위 선택지는 추가 요청한 부위로 제한된다(#7)", async ({
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

  // 부위 배지 → 오늘만 운동 바꾸기 → 어깨 → 오늘만 부위 추가
  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();
  await expect(
    page.getByRole("heading", { name: "오늘만 운동 바꾸기" }),
  ).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: "어깨", exact: true }).click();
  await page.getByRole("button", { name: "오늘만 부위 추가" }).click();
  await expect(page).toHaveURL(/\/plan\/today.*add=1/, { timeout: 30000 });
  await page.waitForTimeout(1200);

  // 새 운동 추가 → 새 행은 '어깨'로 자동 지정.
  await page.getByRole("button", { name: "운동 추가" }).first().click();
  await page.waitForTimeout(300);

  // 부위 드롭다운(기존 가슴 행)의 선택지는 가슴/어깨로만 제한 — 요청 안 한 부위 없음.
  const partSelect = page.getByLabel("부위").first();
  const optionTexts = (await partSelect.locator("option").allInnerTexts()).map(
    (t) => t.trim(),
  );
  expect(optionTexts).toContain("어깨");
  for (const notAllowed of ["등", "하체", "코어", "복근", "팔", "전신"]) {
    expect(optionTexts).not.toContain(notAllowed);
  }
});
