import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 캘린더 2단계(2026-09-29) — 런닝 표시 · 날짜 상세 앞뒤 이동·바로가기 · 주간 목록 ·
 * 체중 점 · 물·영양소.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function seedDay(email: string) {
  // 오늘 5.23km 런닝(32분, 6'07"/km).
  await dbQuery(
    `insert into public.run_sessions
       (user_id, client_session_id, for_date, mode, started_at, ended_at, duration_sec, distance_m, avg_kmh, pace_sec_per_km, calories_kcal)
     values (${uid}, gen_random_uuid(), ${today}, 'indoor', now() - interval '40 minutes', now() - interval '8 minutes', 1920, 5230, 9.8, 367, 350)`,
    [email],
  );
  await dbQuery(`insert into public.weight_logs (user_id, weight_kg) values (${uid}, 71.2)`, [email]);
  await dbQuery(
    `insert into public.water_logs (user_id, for_date, ml) values (${uid}, ${today}, 1500)
       on conflict (user_id, for_date) do update set ml = excluded.ml`,
    [email],
  );
  await dbQuery(
    `insert into public.food_logs (user_id, for_date, meal, name, kcal, protein_g, carbs_g, fat_g)
       values (${uid}, ${today}, 'lunch', 'e2e 닭가슴살 도시락', 520, 42, 55, 12)`,
    [email],
  );
}

test("🔴 달력 칸·주간 목록에 런닝 거리와 체중 점이 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  await seedDay(email);

  await page.goto("/calendar", { waitUntil: "networkidle" });
  const todayCell = page.locator('a[aria-current="date"]');
  await expect(todayCell).toContainText("5.2km");
  await expect(todayCell).toHaveAttribute("aria-label", /런닝 5\.2km, 체중 71\.2kg/);
  await expect(todayCell.getByLabel("체중 잰 날")).toHaveCount(1);
  await expect(page.getByTestId("calendar-legend")).toContainText("런닝 거리");
  await expect(page.getByText("이번 달 요약")).toBeVisible();

  await page.goto("/calendar/week", { waitUntil: "networkidle" });
  const list = page.getByTestId("week-list");
  await expect(list.locator("li")).toHaveCount(7);
  await expect(list.locator('a[aria-current="date"]')).toContainText("5.2km");
  await expect(page.getByText("이번 주 요약")).toBeVisible();
  // 머리글이 원문 날짜가 아니라 "N월 N째 주 · M/D–M/D".
  await expect(page.getByRole("heading", { name: /월 .+ 주 · \d+\/\d+–\d+\/\d+/ })).toBeVisible();
});

test("날짜 상세: 런닝·물·체중·영양소, 식단 바로가기, 앞뒤 날짜 이동", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  await seedDay(email);

  await page.goto("/calendar", { waitUntil: "networkidle" });
  await page.locator('a[aria-current="date"]').click();
  await expect(page).toHaveURL(/\/calendar\/(\d{4}-\d{2}-\d{2})$/);
  const date = page.url().split("/").pop()!;

  const runs = page.getByTestId("day-runs");
  await expect(runs).toContainText("5.2km");
  await expect(runs).toContainText("32분");
  await expect(runs).toContainText("6'07\"/km");
  await expect(runs.getByRole("link")).toHaveAttribute("href", /\/routine\/running-records\//);

  const extras = page.getByTestId("day-extras");
  await expect(extras).toContainText("71.2kg");
  await expect(extras).toContainText("단백질 42g");
  await expect(extras).toContainText("물");

  const actions = page.getByTestId("day-actions");
  await expect(actions.getByRole("link", { name: /이날 식단 기록/ })).toHaveAttribute("href", `/diet?d=${date}`);
  await expect(actions.getByRole("link", { name: /오늘 운동하기/ })).toHaveAttribute("href", "/routine");

  await page.getByRole("link", { name: "전날" }).click();
  await expect(page).not.toHaveURL(new RegExp(`${date}$`));
  // 어제는 '오늘 운동하기' 가 없다.
  await expect(page.getByRole("link", { name: /오늘 운동하기/ })).toHaveCount(0);
  await page.getByRole("link", { name: "다음날" }).click();
  await expect(page).toHaveURL(new RegExp(`${date}$`));
});
