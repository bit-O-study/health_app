import { expect, test } from "@playwright/test";
import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

test("브랜드 헤더·식단 통합 입력·런닝 기록·캘린더 전용 메뉴", async ({ page }, testInfo) => {
  test.skip(!hasDb, "DB required");
  test.setTimeout(240_000);
  const email = await createOnboardedAccount(page);
  await dbQuery(`insert into public.run_sessions (user_id,client_session_id,for_date,mode,started_at,ended_at,duration_sec,distance_m,avg_kmh,pace_sec_per_km)
    values ((select id from auth.users where email=$1),gen_random_uuid(),(now() at time zone 'Asia/Seoul')::date,'outdoor',now()-interval '30 minutes',now(),1800,5000,10,360)`, [email]);
  for (const path of ["/routine", "/diet", "/calendar", "/groups", "/community"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: "헬쑤 홈", exact: true })).toBeVisible();
  }
  await page.goto("/diet", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "음식 기록하기" })).toHaveCount(1);
  for (const meal of ["아침", "점심", "저녁", "간식"]) {
    await page.getByRole("button", { name: "음식 기록하기" }).click();
    const choice = page.getByRole("group", { name: "기록할 끼니" }).getByRole("button", { name: meal, exact: true });
    await expect(choice.locator("svg")).toHaveCount(1);
    await choice.click();
    const dialog = page.getByRole("dialog", { name: `${meal} 추가`, exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
  await page.screenshot({ path: testInfo.outputPath("diet.png"), fullPage: true });
  await page.goto("/routine", { waitUntil: "networkidle" });
  const nav = page.getByRole("navigation", { name: "주요 메뉴" });
  await expect(nav.getByRole("link", { name: "기록", exact: true })).toHaveCount(0);
  await nav.getByRole("link", { name: "런닝 기록", exact: true }).click();
  await expect(page).toHaveURL(/\/routine\/running-records/);
  await expect(nav.getByRole("link", { name: "런닝 기록" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("region", { name: "이달 요약" })).toContainText("5.00km");
  await expect(page.getByRole("link", { name: /야외 런닝 5\.00km 상세 보기/ })).toBeVisible();
  // 이번 달에서는 미래 달로 못 간다.
  await expect(page.getByRole("link", { name: "다음 달", exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("running.png"), fullPage: true });
  await page.getByRole("link", { name: "이전 달", exact: true }).click();
  await expect(page.getByText("이 달에는 저장된 런닝이 없어요.", { exact: false })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "다음 달", exact: true })).toBeVisible();
  await page.goto("/calendar", { waitUntil: "networkidle" });
  await expect(nav.getByRole("link")).toHaveText(["월간", "홈", "주간"]);
  await nav.getByRole("link", { name: "주간", exact: true }).click();
  await expect(page).toHaveURL(/\/calendar\/week/);
  await expect(nav.getByRole("link", { name: "주간" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "월간" })).not.toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "이전 주", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("calendar-week.png"), fullPage: true });
});
