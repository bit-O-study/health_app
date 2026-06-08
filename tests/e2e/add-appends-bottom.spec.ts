import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 멀티 부위(가슴 + 팔) 일자에서 "오늘 운동 추가"로 넣은 운동은 부위 그룹 중간이
// 아니라 전체 리스트 맨 아래에 붙어야 한다.

test("편집에서 추가한 운동은 멀티 부위 일자에서도 맨 아래로 간다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 커스텀: 0일차 = 가슴 + 팔, 나머지 휴식. 기준일=오늘.
  const week = [
    ["chest", "arm"],
    ["rest"],
    ["rest"],
    ["rest"],
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

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 편집 모드 → "오늘 루틴에 운동 추가" 열기
  await page.getByRole("button", { name: "편집하기" }).click();
  await page.getByRole("button", { name: "오늘 루틴에 운동 추가" }).click();
  // 부위=가슴, 운동=펙덱 플라이(시드에 없는 가슴 운동) 선택 후 추가
  await page.getByLabel("부위").selectOption("chest");
  await page.getByLabel("운동").selectOption({ label: "펙덱 플라이" });
  await page.getByRole("button", { name: "추가", exact: true }).click();
  await page.waitForTimeout(1500);

  // DB: 추가된 가슴 행이 append-base(1000) 이상 position 으로, 그 일차 최대여야 한다.
  const rows = await dbQuery<{ position: number; exercise_id: string }>(
    `select position, exercise_id from public.routine_exercises
      where user_id=(select id from auth.users where lower(email)=lower($1))
        and day_index=0 order by position desc limit 1`,
    [email],
  );
  expect(rows[0].exercise_id).toBe("pec-deck");
  expect(rows[0].position).toBeGreaterThanOrEqual(1000);

  // 화면에서도 본운동 리스트의 마지막 항목이 펙덱 플라이여야 한다.
  const mainUl = page.locator("ul.space-y-2").nth(1);
  const lastName = (
    await mainUl.locator("li h3").last().innerText()
  ).split("\n")[0].trim();
  expect(lastName).toContain("펙덱 플라이");
});
