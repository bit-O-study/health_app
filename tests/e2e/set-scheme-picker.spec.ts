import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 세트 방식(드롭세트·피라미드…) 한 번에 채우기.
 *
 * 예전엔 드롭세트를 하려면 세트마다 무게를 직접 계산해 줄을 채워야 했다.
 * 이제 계획 편집에서 방식만 고르면 세트별 무게·횟수가 채워지고, 그대로
 * `set_details` 에 저장된다(운동모드·기록·볼륨이 이미 읽는 컬럼).
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;

test.describe("세트 방식 채우기", () => {
  test("드롭세트를 고르면 세트별 무게가 내려가게 채워지고 저장된다", async ({
    page,
  }) => {
    test.skip(!hasDb, "needs .env.test.local DB creds");
    const email = await createOnboardedAccount(page);
    await seedRecommendedExercises(page);
    // 무게·횟수를 계획 화면에서 정하는 모드여야 무게 칸이 보인다.
    await dbQuery(
      `update public.profiles set lock_weight_reps=true where user_id=${uid}`,
      [email],
    );

    await page.goto("/plan", { waitUntil: "networkidle" });
    const row = page.locator("[data-testid^='plan-row-']").first();
    await expect(row).toBeVisible({ timeout: 15_000 });

    // 기준 무게를 넣어야 무게를 조절하는 방식을 쓸 수 있다.
    await row.locator('input[aria-label="무게(kg)"]').first().fill("100");

    await row.getByRole("button", { name: "세트 방식" }).click();
    await row.getByRole("button", { name: "드롭세트", exact: true }).click();

    // 세트별 모드로 바뀌고 무게가 내려가는 순서로 채워진다.
    const weights = row.locator('input[aria-label$="세트 무게(kg)"]');
    await expect(weights.first()).toBeVisible({ timeout: 10_000 });
    const filled = await weights.evaluateAll((els) =>
      (els as HTMLInputElement[]).map((e) => Number(e.value)),
    );
    expect(filled.length).toBeGreaterThanOrEqual(2);
    expect(filled[0]).toBe(100);
    expect(filled[filled.length - 1]).toBeLessThan(100);
    // 무게 흐름을 읽어 방식 이름이 다시 표시된다.
    await expect(row.getByText("드롭세트", { exact: true }).first()).toBeVisible();

    const day = page.locator("[data-plan-day-index]").filter({ has: row }).first();
    await day.getByRole("button", { name: /일차 저장$/ }).click();
    await expect(page.getByText(/일차 저장됨/)).toBeVisible({ timeout: 15_000 });

    // 🔴 화면 복원만 보면 로컬 상태일 수 있다 — DB 에 실제로 들어갔는지 확인.
    const saved = await dbQuery<{ set_details: unknown }>(
      `select set_details from public.routine_exercises
        where user_id=${uid} and set_details is not null limit 1`,
      [email],
    );
    expect(saved.length).toBe(1);
    const details = saved[0].set_details as { weightKg: number }[];
    expect(details.length).toBeGreaterThanOrEqual(2);
    expect(details[details.length - 1].weightKg).toBeLessThan(
      details[0].weightKg,
    );

    // 새로고침해도 남는다.
    await page.goto("/plan", { waitUntil: "networkidle" });
    const persisted = await page
      .locator('input[aria-label$="세트 무게(kg)"]')
      .evaluateAll((els) => (els as HTMLInputElement[]).map((e) => Number(e.value)));
    expect(persisted[0]).toBe(100);
  });

  test("무게가 없으면 무게를 조절하는 방식은 못 고른다", async ({ page }) => {
    test.skip(!hasDb, "needs .env.test.local DB creds");
    const email = await createOnboardedAccount(page);
    await seedRecommendedExercises(page);
    await dbQuery(
      `update public.profiles set lock_weight_reps=true where user_id=${uid}`,
      [email],
    );

    await page.goto("/plan", { waitUntil: "networkidle" });
    const row = page.locator("[data-testid^='plan-row-']").first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.locator('input[aria-label="무게(kg)"]').first().fill("");

    await row.getByRole("button", { name: "세트 방식" }).click();
    // 맨몸이면 드롭·피라미드는 잠기고, 무게가 필요 없는 방식만 열린다.
    await expect(row.getByRole("button", { name: "드롭세트", exact: true })).toBeDisabled();
    await expect(row.getByRole("button", { name: "클러스터", exact: true })).toBeEnabled();
    await expect(
      row.getByText("무게를 먼저 넣으면", { exact: false }),
    ).toBeVisible();
  });
});

test("무게·횟수 고정이 꺼져 있어도 세트 방식으로 들어갈 수 있다 (켜고 계속)", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  await seedRecommendedExercises(page);
  // 기본값 = 고정 꺼짐(무게는 운동모드에서 정한다). 계획 화면엔 무게 칸이 없다.
  await dbQuery(
    `update public.profiles set lock_weight_reps=false where user_id=${uid}`,
    [email],
  );

  await page.goto("/plan", { waitUntil: "networkidle" });
  const row = page.locator("[data-testid^='plan-row-']").first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row.locator('input[aria-label="무게(kg)"]')).toHaveCount(0);

  await row.getByRole("button", { name: "세트 방식" }).click();
  await expect(row.getByText("무게·횟수 고정", { exact: false })).toBeVisible();
  await row.getByRole("button", { name: "켜고 계속" }).click();

  // 설정이 실제로 켜지고, 화면에 무게 칸이 나타난다.
  await expect(
    page.locator('input[aria-label="무게(kg)"]').first(),
  ).toBeVisible({ timeout: 20_000 });
  const saved = await dbQuery<{ lock_weight_reps: boolean }>(
    `select lock_weight_reps from public.profiles where user_id=${uid}`,
    [email],
  );
  expect(saved[0]?.lock_weight_reps).toBe(true);
});
