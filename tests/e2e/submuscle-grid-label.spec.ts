import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 전체 부위 + 그 세부근육을 같이 고르면(예: 어깨 + 후면삼각근), 요일별 루틴
// 그리드(빌더 미리보기 / 메인 다가오는 7일)에 "어깨"가 아니라 "후면 삼각근"이 떠야 한다.

test("어깨+후면삼각근은 요일별 그리드에 '후면 삼각근'으로 표시", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  const week = [
    ["shoulder", "shoulder-rear"],
    ["rest"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"],
  ];
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom', custom_week=$2::jsonb,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            rest_date=null, override_date=null, override_block=null
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email, JSON.stringify(week)],
  );

  // 메인 '다가오는 7일' 그리드 — select 없음, 그리드 배지가 보여야 한다.
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await expect(page.getByText("후면 삼각근").first()).toBeVisible();
  // 0일차 그리드 셀이 "어깨"가 아니라 "후면 삼각근" 이어야 한다(전체 라벨 대체 확인).
  await expect(page.getByText("어깨 + 후면", { exact: false })).toHaveCount(0);
});
