import { expect, test } from "@playwright/test";
import { prepareSetsEditWorkout } from "./helpers/workout-fixture";
import { hasDb, openDbClient } from "./helpers/db";

test("장시간 백그라운드·앱 복원·무응답 후에도 시간 유지, 일시정지만 시간 제외", async ({ page, baseURL }) => {
  test.skip(!hasDb, "DB fixtures required");
  const email = await prepareSetsEditWorkout(page.context(), baseURL!);
  const db = await openDbClient();
  try {
    await db.query("update public.profiles set hide_exercise_videos=true where user_id=(select id from auth.users where email=$1)", [email]);
  } finally {
    await db.end();
  }
  await page.goto("/routine");
  await page.getByRole("button", { name: "운동 시작", exact: true }).click();
  await expect(page.getByRole("button", { name: "일시정지", exact: true })).toBeVisible();
  const startedAt = await page.evaluate(() => JSON.parse(localStorage.getItem("heltch.workout.timer")!).startedAt as number);
  const timer = page.getByRole("button", { name: "일시정지", exact: true }).locator("..").locator("span.font-mono");
  // 실제 타이머 콜백은 멈추고 시각만 진행시켜 Android가 JS 실행을 동결한 공백을 재현한다.
  await page.clock.install({ time: startedAt });
  await page.clock.pauseAt(startedAt + 1_000);
  await page.clock.setSystemTime(startedAt + 3 * 3_600_000);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(timer).toHaveText("3:00:00");
  // 새 문서 세션에서 localStorage 타이머를 읽는 콜드 복원을 재현한다.
  await page.evaluate(() => sessionStorage.removeItem("heltch.workout.doc"));
  await page.reload();
  await expect(timer).toHaveText("3:00:00");
  // 종료 확인 이후 10분이 지나도 세션이 살아 있어야 한다.
  await page.clock.runFor(30_000);
  await page.clock.runFor(11 * 60_000);
  await expect(page.getByRole("button", { name: "일시정지", exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("heltch.workout.timer")!).pausedAt)).toBeNull();
  const pausedText = await timer.textContent();
  await page.getByRole("button", { name: "일시정지", exact: true }).click();
  await page.clock.setSystemTime(startedAt + 5 * 3_600_000);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  const pausedTimer = page.getByRole("button", { name: "재개", exact: true }).locator("..").locator("span.font-mono");
  await expect(pausedTimer).toHaveText(pausedText!);
  await page.reload();
  await expect(pausedTimer).toHaveText(pausedText!);
  await page.getByRole("button", { name: "재개", exact: true }).click();
  await page.clock.runFor(30_000);
  await expect(timer).not.toHaveText(pausedText!);
  await page.getByRole("button", { name: "정지하고 시간 저장", exact: true }).click();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("button", { name: "운동 시작", exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("heltch.workout.timer"))).toBeNull();
});
