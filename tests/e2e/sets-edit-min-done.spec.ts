import { expect, test } from "@playwright/test";

import { prepareSetsEditWorkout } from "./helpers/workout-fixture";
import { hasDb } from "./helpers/db";

// 회귀 가드 (2026-09-25): 운동모드에서 3세트를 완료했으면, '오늘 할 운동' 편집에서
// 총 세트를 3 아래로 줄일 수 없다 — 세트 완료를 취소하기 전까지(운동모드와 같은 규칙).
// fixture: 하체 · 스쿼트 4세트(무게·횟수 고정 켬).

test("완료한 세트 아래로 세트 수를 줄일 수 없다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await prepareSetsEditWorkout(page.context(), baseURL!);

  await page.goto("/routine", { waitUntil: "networkidle" });
  // 운동모드가 남기는 '오늘 완료한 세트' 기록 — (부위:운동) 키로 3세트 완료.
  await page.evaluate(() => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
    localStorage.setItem(
      "heltch.workout.edits",
      JSON.stringify({ date: today, main: {}, cond: {}, setsDone: {}, setsDoneByKey: { "f:lower:squat": 3 } }),
    );
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: "편집하기" }).click();
  await page.getByRole("button", { name: "수정" }).first().click();
  await expect(page.getByTestId("sets-min-hint")).toContainText("3세트");

  const setsInput = page.getByLabel("세트", { exact: true });
  await setsInput.fill("2");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("이미 3세트를 완료했어요. 세트 완료를 취소해야 줄일 수 있어요.")).toBeVisible();

  // 완료한 만큼(3)으로는 줄일 수 있다.
  await setsInput.fill("3");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText(/3세트/).first()).toBeVisible({ timeout: 8000 });

  // 세트 완료를 취소(0)하면 다시 줄일 수 있다.
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("heltch.workout.edits") ?? "{}");
    raw.setsDoneByKey = { "f:lower:squat": 0 };
    localStorage.setItem("heltch.workout.edits", JSON.stringify(raw));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "편집하기" }).click();
  await page.getByRole("button", { name: "수정" }).first().click();
  await expect(page.getByTestId("sets-min-hint")).toHaveCount(0);
  await page.getByLabel("세트", { exact: true }).fill("2");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText(/2세트/).first()).toBeVisible({ timeout: 8000 });
});
