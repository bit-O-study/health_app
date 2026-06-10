import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 보조로 세부근육(가슴 상부/하부)을 고르면, 운동 등록 화면의 슬롯 라벨이
// 부모 부위("가슴")가 아니라 고른 세부근육("가슴 상부, 가슴 하부")으로 떠야 한다.

test("보조 세부근육 슬롯은 등록 화면에서 세부근육명으로 표시(전 부위)", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 0일차: 당기기(주) + 가슴 상부·하부(보조), 1일차: 어깨(주) + 햄스트링(보조)
  const week = [
    ["pull", "chest-upper", "chest-lower"],
    ["shoulder", "lower-hamstrings"],
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

  await page.goto("/plan", { waitUntil: "networkidle" });

  // 가슴 슬롯 헤더가 "가슴 상부 …" 로 (부모 "가슴" 단독이 아님)
  await expect(page.getByText("가슴 상부").first()).toBeVisible();
  await expect(page.getByText("가슴 하부").first()).toBeVisible();
  // 다른 부위도 동일 — 햄스트링
  await expect(page.getByText("햄스트링").first()).toBeVisible();
});
