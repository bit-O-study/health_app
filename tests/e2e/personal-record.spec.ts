import { expect, test } from "@playwright/test";

import { createTestAccount } from "./helpers/account-fixture";
import { hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * 개인 신기록 알림(무료, 2026-09-30).
 * 어제 스쿼트 60kg×8(예상 1RM 76kg) → 오늘 무게를 65kg 으로 올려 8회(82.3kg) 한 세트를 끝내면 바로 축하한다.
 */
test("지난 기록보다 무거운 세트를 끝내면 신기록 알림", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(120_000);
  await silenceDevOverlay(page);

  const { supabase, user_id } = await createTestAccount(page.context(), baseURL!, false);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const routine = await supabase.from("user_routines").insert({
    user_id, splits: 0, variant_id: "custom",
    custom_week: [["lower"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"]],
    start_date: today, day_index_migrated: true,
  });
  if (routine.error) throw routine.error;
  const ex = await supabase.from("routine_exercises").insert({
    user_id, day_index: 0, focus: "lower", position: 0, exercise_id: "squat",
    equipment: "barbell", sets: 4, reps: 8, weight_kg: 65,
  });
  if (ex.error) throw ex.error;
  const past = await supabase.from("exercise_completions").insert({
    user_id, for_date: yesterday, exercise_row_id: crypto.randomUUID(), status: "done",
    exercise_id: "squat", equipment: "barbell", focus: "lower", sets: 4, reps: 8, weight_kg: 60,
  });
  if (past.error) throw past.error;

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "운동 시작" }).click();
  const ready = page.getByRole("button", { name: "준비됐어요" });
  await ready.waitFor({ timeout: 10_000 }).catch(() => {});
  if (await ready.count()) await ready.click();

  const weight = page.getByRole("slider", { name: "무게" });
  await expect(weight).toBeVisible({ timeout: 10_000 });
  // 운동 모드는 지난 기록(60kg)에서 시작한다 — 사용자처럼 올려서 65kg 으로.
  await page.getByRole("button", { name: "무게 2.5kg 늘리기" }).click();
  await page.getByRole("button", { name: "무게 2.5kg 늘리기" }).click();
  await expect(weight).toHaveAttribute("aria-valuenow", "65");
  // 지난 기록을 읽을 틈을 준다(운동 모드가 열릴 때 한 번 읽는다).
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "세트 완료", exact: true }).click();

  await expect(page.getByTestId("pr-toast")).toHaveText("신기록! 스쿼트 예상 1RM 82.3kg (+6.3kg)", { timeout: 5_000 });
});
