import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 재현/회귀: 운동 모드(가이드)에서 운동을 '완료'한 뒤 다시 운동 시작하면, 완료한
// 운동이 큐에 다시 뜨면 안 된다. (가이드 완료가 공유 오버라이드를 갱신 안 해서
// 서버 새로고침 전 재진입 시 다시 뜨던 문제 가드.)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

for (const scenario of ["normal", "delayed", "failure", "duration-failure"] as const) {
test("가이드 전체 완료 후 운동 화면 유지: " + scenario, async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const email = await createOnboardedAccount(page);

  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["lower"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60),
            (${uid}, 0, 'lower', 1, 'pec-deck', 'machine', 4, 12, 20)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);

  const overlay = page.getByTestId("guided-scroll");
  // 스쿼트 완료 → 펙덱로
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toBeVisible({
    timeout: 8000,
  });
  await page.getByRole("button", { name: "운동 완료" }).click();
  await page.waitForTimeout(700);
  // 펙덱 완료 → 종료
  await expect(overlay.getByRole("heading", { name: "펙덱 플라이" })).toBeVisible({
    timeout: 8000,
  });
  if (scenario === "normal") {
    const weight = page.getByRole("slider", { name: "무게", exact: true });
    await expect(weight).toHaveAttribute("aria-valuenow", "20");
    await page.getByRole("button", { name: "무게 늘리기" }).click();
    await expect(weight).toHaveAttribute("aria-valuenow", "25");
    await page.getByRole("button", { name: "무게 줄이기" }).click();
    await expect(weight).toHaveAttribute("aria-valuenow", "20");
  }
  const durationRequests: number[] = [];
  let intercepted = false;
  let failSave = scenario === "failure" || scenario === "duration-failure";
  if (scenario !== "normal") {
    await page.route("**/routine", async (route) => {
      const request = route.request();
      const body = request.postData() ?? "";
      const isTarget = scenario === "duration-failure"
        ? /^\["\d{4}-\d{2}-\d{2}",\d+\]$/.test(body)
        : body.includes("pec-deck") && body.includes('"done"');
      if (request.method() !== "POST" || !isTarget) {
        await route.continue();
        return;
      }
      intercepted = true;
      if (scenario === "duration-failure") durationRequests.push(JSON.parse(body)[1]);
      if (failSave) {
        await route.fulfill({ status: 503, contentType: "text/plain", body: "test save failure" });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 3500));
        await route.continue();
      }
    });
  }
  await page
    .getByRole("button", { name: "운동 완료" })
    .or(page.getByRole("button", { name: "완료하고 종료" }))
    .click();
  if (scenario !== "normal") {
    await expect.poll(() => intercepted).toBe(true);
    await expect(page.getByTestId("workout-finishing")).toBeVisible();
    await expect(page.getByText("수고하셨습니다", { exact: true })).toHaveCount(0);
    if (scenario === "failure" || scenario === "duration-failure") {
      if (scenario === "duration-failure") {
        await page.getByRole("button", { name: "확인", exact: true }).click();
        await expect(page.getByText("운동 시간을 저장하지 못했어요. 다시 시도해 주세요.")).toBeVisible();
      } else {
        await expect(page.getByText("운동 기록을 저장하지 못했어요. 다시 시도해 주세요.")).toBeVisible();
      }
      failSave = false;
      await page.getByRole("button", { name: "다시 저장" }).click();
    } else {
      await expect(page.getByRole("status")).toHaveText("운동 기록 저장 중…");
    }
  }
  await expect(page).toHaveURL(/\/routine(?:\?|$)/);
  await expect(page.getByText("수고하셨습니다", { exact: true })).toBeVisible({
    timeout: 8000,
  });
  expect(pageErrors).toEqual([]);

  // 다시 운동 시작 — 둘 다 완료라 뜰 게 없어야 한다(펙덱이 다시 뜨면 버그).
  const startAgain = page.getByRole("button", { name: "운동 시작" });
  if (await startAgain.count()) {
    await startAgain.click();
    await page.waitForTimeout(1200);
  }
  await expect(overlay.getByRole("heading", { name: "펙덱 플라이" })).toHaveCount(0);
  await expect(overlay.getByRole("heading", { name: "스쿼트" })).toHaveCount(0);

  const saved = await dbQuery<{ duration_sec: number }>(
    "select duration_sec from public.workout_sessions where user_id=" + uid,
    [email],
  );
  expect(saved[0]?.duration_sec).toBeGreaterThan(0);
  if (scenario === "duration-failure") {
    expect(durationRequests).toHaveLength(2);
    expect(durationRequests[1]).toBe(durationRequests[0]);
    expect(saved[0]?.duration_sec).toBe(durationRequests[0]);
  }
  await page.reload();
  await expect(page.getByText("수고하셨습니다", { exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

}
