import { expect, test } from "@playwright/test";

import { createOnboardedAccount, seedRecommendedExercises } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 오늘만 바꾸기 — 탭 세 개(운동 더하기 · 부위 바꾸기 · 오늘 쉬기) + 운동 찾아서 더하기(2026-10-14).
// 예전엔 한 화면에 네 가지 일이 섞여 있었고, 운동 하나를 더하려면 부위를 고르고 편집 화면으로 넘어가야 했다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("운동을 찾아 오늘에만 더한다 — 지금 운동과 루틴은 그대로", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(180_000);
  const email = await createOnboardedAccount(page);
  await seedRecommendedExercises(page);
  const routineBefore = await dbQuery<{ n: number }>(
    `select count(*)::int n from public.routine_exercises where user_id=${uid}`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  const later = page.getByRole("button", { name: /나중에/ });
  if (await later.count()) await later.first().click().catch(() => {});
  await page.locator("[data-today-focus-badge]").first().click();
  await page.getByRole("button", { name: "오늘만 운동 바꾸기" }).first().click();

  // 첫 탭은 운동 더하기. 부위 칩·쉬기는 다른 탭에 있다.
  await expect(page.getByRole("tab", { name: "운동 더하기" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "오늘만 부위 추가" })).toHaveCount(0);
  await page.getByRole("tab", { name: "오늘 쉬기" }).click();
  await expect(page.getByRole("button", { name: /오늘 휴식 전환하기/ })).toBeVisible();
  await page.getByRole("tab", { name: "부위 바꾸기" }).click();
  await expect(page.getByRole("button", { name: "오늘만 부위 추가" })).toBeDisabled();
  await page.getByRole("tab", { name: "운동 더하기" }).click();

  // 다른 표기('웰엔젤')로 찾아도 월엔젤이 나온다. 고르고 담는다.
  const picker = page.getByTestId("today-add-picker");
  await expect(picker.getByRole("button", { name: "담을 운동을 골라 주세요" })).toBeDisabled();
  await picker.getByLabel("더할 운동 찾기").fill("웰엔젤");
  await picker.getByRole("button", { name: "찾기" }).click();
  const row = page.getByTestId("today-add-wall-angel");
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.click();
  await expect(row).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("today-add-picked")).toContainText("담은 운동 1개");
  await picker.getByRole("button", { name: "1개 오늘만 담기" }).click();

  // 오늘 계획에만 들어가고, 영구 루틴은 그대로다(원칙 2).
  await expect
    .poll(
      async () =>
        (
          await dbQuery<{ n: number }>(
            `select count(*)::int n from public.daily_plan where user_id=${uid} and for_date=${today} and exercise_id='wall-angel'`,
            [email],
          )
        )[0].n,
      { timeout: 20_000 },
    )
    .toBe(1);
  const routineAfter = await dbQuery<{ n: number; angel: number }>(
    `select count(*)::int n, count(*) filter (where exercise_id='wall-angel')::int angel from public.routine_exercises where user_id=${uid}`,
    [email],
  );
  expect(routineAfter[0]).toEqual({ n: routineBefore[0].n, angel: 0 });
  await expect(page.getByText("월엔젤 (월 엔젤)").first()).toBeVisible({ timeout: 20_000 });
});
