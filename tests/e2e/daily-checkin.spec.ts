import { expect, test, type Page } from "@playwright/test";

import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 오늘 컨디션 체크인 · 아픈 부위 — 무료(2026-09-30).
 * 🔴 세트 줄이기는 오늘 계획에서만 — 영구 루틴은 그대로(원칙 2).
 */
async function squatToday(page: Page, baseURL: string) {
  await silenceDevOverlay(page);
  const { supabase, user_id } = await createTestAccount(page.context(), baseURL, false);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const routine = await supabase.from("user_routines").insert({
    user_id, splits: 0, variant_id: "custom",
    custom_week: [["lower"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"]],
    start_date: today, day_index_migrated: true,
  });
  if (routine.error) throw routine.error;
  const ex = await supabase.from("routine_exercises").insert({
    user_id, day_index: 0, focus: "lower", position: 0, exercise_id: "squat",
    equipment: "barbell", sets: 4, reps: 8, weight_kg: 60,
  });
  if (ex.error) throw ex.error;
  return { user_id, today };
}

test("컨디션이 안 좋으면 '오늘만 세트 줄이기' — 오늘 계획만 줄고 루틴은 그대로", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(120_000);
  const { user_id, today } = await squatToday(page, baseURL!);

  await page.goto("/routine", { waitUntil: "networkidle" });
  const card = page.getByTestId("daily-checkin");
  await expect(card).toBeVisible({ timeout: 10_000 });
  await card.getByRole("group", { name: "잠은 잘 잤나요?" }).getByRole("button", { name: "못 잤어요" }).click();
  await card.getByRole("group", { name: "근육통은요?" }).getByRole("button", { name: "조금" }).click();
  await card.getByRole("group", { name: "기운은요?" }).getByRole("button", { name: "보통" }).click();

  // 저장하면 오늘 운동 화면을 다시 그린다(개발 서버에선 느리다).
  await expect(card).toHaveAttribute("data-advice", "light", { timeout: 30_000 });
  await expect(page.getByTestId("daily-checkin-advice")).toContainText("가볍게");
  const saved = await dbQuery<{ sleep: number }>(
    `select sleep from public.daily_checkins where user_id=$1 and for_date=$2`,
    [user_id, today],
  );
  expect(saved[0]?.sleep).toBe(1);

  await page.getByTestId("daily-checkin-lighten").click();
  // 줄인 뒤 오늘 화면을 새로 읽는다(개발 서버에선 느리다).
  await expect(page.getByText("오늘은 세트를 줄였어요")).toBeVisible({ timeout: 45_000 });

  const daily = await dbQuery<{ exercise_id: string; sets: number }>(
    `select exercise_id, sets from public.daily_plan where user_id=$1 and for_date=$2`,
    [user_id, today],
  );
  expect(daily).toEqual([{ exercise_id: "squat", sets: 3 }]);
  // 🔴 원칙 2 — 영구 루틴은 4세트 그대로.
  const kept = await dbQuery<{ sets: number }>(`select sets from public.routine_exercises where user_id=$1`, [user_id]);
  expect(kept[0]?.sets).toBe(4);
});

test("아픈 부위를 고르면 오늘 운동에서 그 부위를 알려 준다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(120_000);
  const { user_id } = await squatToday(page, baseURL!);

  await page.goto("/settings/pain", { waitUntil: "networkidle" });
  await page.getByRole("group", { name: "아픈 부위" }).getByRole("button", { name: "다리·무릎" }).click();
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("status")).toHaveText("저장했어요.", { timeout: 10_000 });
  const p = await dbQuery<{ pain_areas: string[] }>(`select pain_areas from public.profiles where user_id=$1`, [user_id]);
  expect(p[0]?.pain_areas).toEqual(["lower"]);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await expect(page.getByTestId("daily-pain")).toContainText("다리·무릎 운동 1개", { timeout: 10_000 });
});
