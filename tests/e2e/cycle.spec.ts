import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 월경(생리) 기록: 여성 프로필에서 날짜 기록 → 하트 표시 + 예측 + 캘린더 마커.

const uid = `(select id from auth.users where lower(email)=lower($1))`;

test("생리 기록 → 하트·예측·캘린더 마커", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await dbQuery(`update public.profiles set gender='female' where user_id=${uid}`, [email]);

  await page.goto("/cycle", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // 15일 칸 → 생리 기록(출혈량 보통 + 증상 생리통) 저장
  await page.getByRole("button", { name: "15", exact: true }).click();
  await page.getByRole("button", { name: /생리 시작|생리 중/ }).click();
  await page.getByRole("button", { name: "보통", exact: true }).click();
  await page.getByRole("button", { name: "생리통", exact: true }).click();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page.waitForTimeout(1000);

  // DB 저장 확인
  const rows = await dbQuery<{ flow: string; is_period: string; symptoms: string }>(
    `select flow, is_period::text, array_to_string(symptoms,',') as symptoms
       from public.cycle_logs where user_id=${uid} and is_period=true`,
    [email],
  );
  expect(rows.length).toBe(1);
  expect(rows[0].flow).toBe("medium");
  expect(rows[0].symptoms).toContain("생리통");

  // 예측 요약(다음 생리) 표시
  await expect(page.getByText("다음 생리")).toBeVisible({ timeout: 8000 });

  // 캘린더에도 생리 마커(하트) + 생리 기록 링크
  await page.goto("/calendar", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await expect(page.getByLabel("생리").first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("link", { name: /생리 기록/ })).toBeVisible();
});
