import { expect, test, type BrowserContext } from "@playwright/test";

import { hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";
import { createTestAccount } from "./helpers/account-fixture";

/**
 * 카메라로 횟수 세기(2026-09-30, docs/rep-counter-review-2026-09-30.html).
 *
 * 실제 카메라·자세 인식은 자동 테스트에서 못 돌린다(헤드리스엔 카메라가 없다). 그래서
 * 개발 빌드에만 있는 입구(`__jimkkunRepFeed`)로 **무릎 각도**를 직접 넣어, 화면 흐름 —
 * 버튼 → 세기 → 덜 내려간 동작은 안 셈 → 횟수 칸에 넣기 — 을 끝까지 확인한다.
 * 각도 판정 자체는 tests/be/logic/rep-counter.test.ts 가 지킨다.
 */
/** 스쿼트 4세트 × 8회, '고정 끔'(운동 모드에 횟수 칸이 있다). */
async function prepareSquatWorkout(context: BrowserContext, baseURL: string) {
  const { supabase, user_id } = await createTestAccount(context, baseURL, false);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const routine = await supabase.from("user_routines").insert({
    user_id, splits: 0, variant_id: "custom",
    custom_week: [["lower"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"]],
    start_date: today, day_index_migrated: true,
  });
  if (routine.error) throw routine.error;
  const exercise = await supabase.from("routine_exercises").insert({
    user_id, day_index: 0, focus: "lower", position: 0, exercise_id: "squat",
    equipment: "barbell", sets: 4, reps: 8, weight_kg: 60,
  });
  if (exercise.error) throw exercise.error;
}

test("스쿼트: 카메라로 센 횟수가 운동 모드 횟수 칸에 들어간다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(120_000);
  await silenceDevOverlay(page);
  await prepareSquatWorkout(page.context(), baseURL!);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "운동 시작" }).click();

  // 처음 하는 운동이면 '준비 3가지' 카드가 먼저 뜬다.
  const ready = page.getByRole("button", { name: "준비됐어요" });
  await ready.waitFor({ timeout: 10_000 }).catch(() => {});
  if (await ready.count()) await ready.click();

  const open = page.getByTestId("rep-camera-open");
  await expect(open).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("slider", { name: "횟수" })).toHaveAttribute("aria-valuenow", "8");
  await open.click();

  const sheet = page.getByTestId("rep-camera-sheet");
  await expect(sheet).toBeVisible();
  const apply = sheet.getByRole("button", { name: /회 넣기|센 횟수가 없어요/ });
  await expect(apply).toBeDisabled();

  // 헤드리스엔 카메라가 없어 안내 문구가 나온다(앱이 멈추지 않는다).
  await expect(page.getByTestId("rep-camera-status")).toContainText(/카메라/, { timeout: 10_000 });

  await page.waitForFunction(() => typeof (window as unknown as { __jimkkunRepFeed?: unknown }).__jimkkunRepFeed === "function");
  const feed = (angles: (number | null)[]) =>
    page.evaluate((list) => {
      const f = (window as unknown as { __jimkkunRepFeed: (a: number | null) => void }).__jimkkunRepFeed;
      list.forEach((a) => f(a));
    }, angles);

  const fullRep = [175, 150, 120, 95, 80, 70, 70, 90, 120, 150, 170, 175, 175];
  const partialRep = [175, 150, 135, 130, 130, 145, 165, 175, 175];
  await feed([175, 175]);
  await feed(fullRep);
  await feed(partialRep); // 130°까지만 — 세지 않는다
  await feed(fullRep);
  await feed([null, null]); // 잠깐 가려짐 — 센 것은 그대로

  await expect(page.getByTestId("rep-camera-count")).toHaveText("2");
  await expect(apply).toHaveText("끝내고 2회 넣기");
  await apply.click();

  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "횟수" })).toHaveAttribute("aria-valuenow", "2");
});
