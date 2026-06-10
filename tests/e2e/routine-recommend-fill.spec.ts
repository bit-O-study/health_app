import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 루틴 설정에서 "추천으로 운동선택" 으로 저장하면 그 루틴의 부위에 추천 운동이
// 실제로 등록돼야 한다. (저장 후 이동도 운동 화면으로 가야 함)

test("루틴 빌더: 추천으로 저장하면 운동이 등록되고 운동 화면이 보인다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  const uid = `(select id from auth.users where lower(email)=lower($1))`;

  // 깨끗한 상태에서 시작
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [
    email,
  ]);

  await page.goto("/settings/routine", { waitUntil: "networkidle" });

  // 추천 모드 선택(기본값이지만 명시) 후 저장
  await page.getByTestId("fillmode-recommend").click();
  await page.getByRole("button", { name: "저장" }).last().click();

  // 저장 후 운동 화면(/routine)으로 가야 한다 — 모드선택 페이지("/")가 아니라.
  await page.waitForURL(/\/routine$/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "오늘의 운동" }),
  ).toBeVisible({ timeout: 15_000 });

  // DB 에 추천 운동이 실제로 등록됐는지
  const rows = await dbQuery<{ n: string }>(
    `select count(*)::text n from public.routine_exercises where user_id=${uid}`,
    [email],
  );
  expect(Number(rows[0].n)).toBeGreaterThan(0);
});
