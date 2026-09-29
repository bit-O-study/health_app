import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 캘린더 1단계(2026-09-29) — 칼로리 수지(기초대사량 포함)·범례·읽기 문장·죽은 화면 정리.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("🔴 칼로리 수지는 기초대사량을 넣어 계산하고, 범례·오늘 표시가 있다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  // 남 70kg·175cm → 기초대사량 10·70 + 6.25·175 − 5·나이 + 5 (앱 기본 나이 사용).
  await dbQuery(
    `update public.profiles set gender='male', weight_kg=70, height_cm=175 where user_id=${uid}`,
    [email],
  );
  // 오늘 1,000kcal 만 먹었다 → 기초대사량보다 한참 적으니 '살 빠지는 쪽'.
  await dbQuery(
    `insert into public.food_logs (user_id, for_date, meal, name, kcal) values (${uid}, ${today}, 'lunch', 'e2e 점심', 1000)`,
    [email],
  );

  await page.goto("/calendar", { waitUntil: "networkidle" });

  const balance = page.getByTestId("calorie-balance");
  await expect(balance).toContainText("칼로리 수지");
  await expect(balance).toContainText("살 빠지는 쪽");
  await expect(balance).toContainText("−");
  await expect(page.getByTestId("calorie-balance-note")).toContainText("식단 기록한 1일 기준");
  await expect(page.getByText("칼로리 적자")).toHaveCount(0);

  const legend = page.getByTestId("calendar-legend");
  await expect(legend).toContainText("먹은 kcal");
  await expect(legend).toContainText("근력운동");
  await expect(legend).toContainText("다짐 달성");

  // 오늘 칸: 현재 날짜 표시 + 먹은 양이 읽기 문장에 들어간다.
  const todayCell = page.locator('a[aria-current="date"]');
  await expect(todayCell).toHaveCount(1);
  await expect(todayCell).toHaveAttribute("aria-label", /오늘, 먹은 1,000kcal/);

  // 날짜 상세로 이동된다.
  await todayCell.click();
  await expect(page).toHaveURL(/\/calendar\/\d{4}-\d{2}-\d{2}$/);
});

test("주간 달력에도 범례·수지가 있고, 옛 view=goals 주소는 보통 달력을 보여 준다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await createOnboardedAccount(page);

  await page.goto("/calendar/week", { waitUntil: "networkidle" });
  await expect(page.getByTestId("calendar-legend")).toBeVisible();
  await expect(page.getByTestId("calorie-balance")).toContainText("식단 기록 없음");
  await expect(page.locator('a[aria-current="date"]')).toHaveCount(1);

  await page.goto("/calendar?view=goals", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "나의 목표" })).toHaveCount(0);
  await expect(page.getByTestId("calendar-legend")).toBeVisible();
});
