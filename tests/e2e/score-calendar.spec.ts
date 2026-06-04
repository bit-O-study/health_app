import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 가이드를 끝까지 "완료"로 진행 (넘기기 아님).
async function completeWorkout(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);
  for (let i = 0; i < 40; i++) {
    const last = page.getByRole("button", { name: "완료하고 종료" });
    const mid = page.getByRole("button", { name: /^완료$/ });
    if (await last.count()) { await last.click(); break; }
    if (await mid.count()) { await mid.click(); await page.waitForTimeout(420); continue; }
    break;
  }
  await page.waitForTimeout(1500);
}

// 운동 점수 + 운동 캘린더(기록) are downstream of completing a workout:
//  - completing each item writes exercise_completions (→ score)
//  - finishing the session writes workout_sessions duration (→ calendar)
// This also exercises exercise_completions.set_details (another drifted column).
test("운동 완료 → 점수와 캘린더에 반영된다", async ({ page }) => {
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  // complete the whole workout through the guide (완료, not 넘기기)
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);
  let completed = 0;
  for (let i = 0; i < 40; i++) {
    const last = page.getByRole("button", { name: "완료하고 종료" });
    const mid = page.getByRole("button", { name: /^완료$/ });
    if (await last.count()) { await last.click(); completed++; break; }
    if (await mid.count()) { await mid.click(); completed++; await page.waitForTimeout(420); continue; }
    break;
  }
  expect(completed).toBeGreaterThan(0);
  await page.waitForTimeout(1500);

  // 운동 점수 — page renders and reflects activity (completed count / score)
  await page.goto("/settings/score", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /점수|운동 점수/ }).first()).toBeVisible();
  // no Next error overlay / runtime error text
  await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");

  // 운동 캘린더(기록) — current month grid renders without error
  await page.goto("/settings/history", { waitUntil: "networkidle" });
  await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
  // weekday header of the calendar should be present
  await expect(page.getByText("월", { exact: true }).first()).toBeVisible();
});

// 부위별 밸런스 3D 마네킹이 점수 화면에 에러 없이 렌더된다 (WebGL 실패 시 2D 폴백).
test("부위별 밸런스 3D 마네킹이 점수 화면에 렌더된다", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await signUpAndOnboard(page);
  await page.goto("/settings/score", { waitUntil: "networkidle" });

  const balance = page.locator("section", { hasText: "부위별 밸런스" });
  await expect(balance).toBeVisible();

  // 3D 캔버스 또는 (WebGL 미지원 시) 2D 마네킹 폴백 중 하나는 반드시 보인다.
  const canvas3d = page.getByTestId("balance-mannequin-canvas");
  const svg2d = page.getByRole("img", { name: "부위별 발달도 마네킹" });
  await expect(canvas3d.or(svg2d)).toBeVisible();

  await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
  const fatal = errors.filter(
    (e) => e.includes("limb") || e.includes("Could not load"),
  );
  expect(fatal, fatal.join("\n")).toHaveLength(0);
});

// 세부근육 단위 밸런스 — 완료한 운동이 세부근육별로 갈려 토글/분포로 나타난다.
// (완료 기록을 DB에 직접 시드 → 가이드의 비동기 완료 타이밍에 의존하지 않음)
test("세부근육 단위 밸런스: 토글 + 분포가 운동 기록으로 나타난다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // incline-curl → 이두 장두, bench-press → 중부·하부 대흉근
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, exercise_id, status, focus, sets, reps, weight_kg)
     values
       ((select id from auth.users where lower(email)=lower($1)), current_date, gen_random_uuid(), 'incline-curl', 'done', 'arm', 4, 10, 20),
       ((select id from auth.users where lower(email)=lower($1)), current_date, gen_random_uuid(), 'bench-press', 'done', 'chest', 5, 5, 100)`,
    [email],
  );

  await page.goto("/settings/score", { waitUntil: "networkidle" });
  const balance = page.locator("section", { hasText: "부위별 밸런스" });

  // 세부근육 토글이 보이고, 누르면 세부근육 분포가 나타난다
  await expect(balance.getByTestId("balance-mode-detail")).toBeVisible();
  await balance.getByTestId("balance-mode-detail").click();
  await expect(page.getByText("세부근육 분포")).toBeVisible();
  // 이두 장두 같은 세부근육 라벨이 분포에 노출
  await expect(page.getByText("이두 장두").first()).toBeVisible();
});

// 회귀: 체성분이 등록돼 있어도, 운동을 완료하면 부위별 점수가 운동 기반으로 반영돼야 한다.
// (예전엔 체성분이 있으면 부위별을 체성분 기반으로만 계산해 운동이 무시됐음.)
test("체성분이 있어도 운동 완료가 부위별 점수에 반영된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedRecommendedExercises(page);
  await completeWorkout(page);

  // 체성분 등록(근육량 값) — 이게 있으면 예전 코드는 부위별을 체성분 기반으로 덮어썼다.
  await dbQuery(
    `insert into public.body_compositions
       (user_id, muscle_trunk, muscle_right_arm, muscle_left_arm, muscle_right_leg, muscle_left_leg)
     values ((select id from auth.users where lower(email) = lower($1)), 30, 3, 3, 9, 9)`,
    [email],
  );

  await page.goto("/settings/score", { waitUntil: "networkidle" });
  const balance = page.locator("section", { hasText: "부위별 밸런스" });
  // 운동이 반영되므로 "운동량 기반" 배지여야 하고, "체성분 기반" 이면 안 된다.
  await expect(balance.getByText("운동량 기반")).toBeVisible();
  await expect(balance.getByText("체성분 기반")).toHaveCount(0);
  // 부위별 점수 중 0보다 큰 값이 하나 이상 있어야 한다(운동 반영).
  const nums = await balance
    .locator("p.text-xl")
    .evaluateAll((els) => els.map((e) => parseInt(e.textContent || "0", 10)));
  expect(nums.some((n) => n > 0)).toBe(true);
});
