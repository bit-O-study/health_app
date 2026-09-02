import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 스키마 드리프트로 터졌던 두 버그의 회귀 가드.
//  1) 7일 루틴 저장 → splits=7 이 user_routines_splits_check 를 통과해야 한다(예전 0..6)
//  2) 세트별 다른 kg(피라미드) → set_details 컬럼이 있어야 하고 저장이 남아야 한다
//
// ⚠ 이 스펙은 **화면 동선이 바뀌면 같이 고쳐야 한다.** 2026-09-02 에 두 테스트가 며칠째
// 깨져 있던 원인이 그거였다 — 루틴 설정의 '직접 등록할게요' 가 '직접 운동선택' 라디오로
// 바뀌었고, 계획 편집은 무게·횟수 고정이 켜져 있을 때만 무게 칸을 보여준다.
// 가드하려는 것(위 두 줄)은 그대로다.

const uid = `(select id from auth.users where lower(email)=lower($1))`;

test.describe("routine + plan registration", () => {
  test("7일 루틴(splits=7) 저장이 성공한다", async ({ page }) => {
    test.skip(!hasDb, "needs .env.test.local DB creds");
    const email = await signUpAndOnboard(page);

    await page.goto("/settings/routine", { waitUntil: "networkidle" });
    const planner = page.locator('section:has-text("나의 루틴")').last();
    await planner.getByRole("button", { name: "7일 루틴" }).click();
    // '직접 운동선택' = 저장 후 /plan 으로 간다(추천은 /routine, 근육별은 /plan/muscle).
    await planner.getByText("직접 운동선택").click();
    await planner.getByRole("button", { name: "저장" }).click();

    // 성공 = /plan 으로 이동. 제약 위반이면 루틴 화면에 빨간 오류가 남는다.
    await page.waitForURL((u) => new URL(u).pathname === "/plan", {
      timeout: 20_000,
    });
    await expect(page.locator("p.text-red-600, p.text-red-400")).toHaveCount(0);

    // 화면만 보고 끝내지 않는다 — 제약을 통과해 **실제로 7이 저장됐는지** 확인한다.
    const rows = await dbQuery<{ splits: number }>(
      `select splits from public.user_routines where user_id=${uid}`,
      [email],
    );
    expect(rows[0]?.splits).toBe(7);
  });

  test("세트별 다른 kg(피라미드) 등록이 저장·영속된다", async ({ page }) => {
    test.skip(!hasDb, "needs .env.test.local DB creds");
    const email = await signUpAndOnboard(page);
    // 갓 가입한 계정의 /plan 은 비어 있다 — 고칠 줄이 있어야 한다.
    await seedRecommendedExercises(page);
    // 무게·횟수를 계획 화면에서 정하는 모드여야 세트별 입력칸이 나온다.
    // (기본은 꺼져 있어 세트 수만 보인다 — 운동모드에서 무게를 정한다)
    await dbQuery(
      `update public.profiles set lock_weight_reps=true where user_id=${uid}`,
      [email],
    );

    await page.goto("/plan", { waitUntil: "networkidle" });
    const row = page.locator("[data-testid^='plan-row-']").first();
    await expect(row).toBeVisible({ timeout: 15_000 });

    await row.getByRole("button", { name: "세트별 다르게" }).click();

    const weights = row.locator('input[aria-label$="세트 무게(kg)"]');
    const addSet = row.getByRole("button", { name: "세트 추가" });
    while ((await weights.count()) < 3) await addSet.click();

    const want = ["40", "50", "60"];
    for (let i = 0; i < 3; i++) await weights.nth(i).fill(want[i]);

    // 이 줄이 속한 일차만 저장한다(화면에 일차가 여러 개다).
    const day = page.locator("[data-plan-day-index]").filter({ has: row }).first();
    await day.getByRole("button", { name: /일차 저장$/ }).click();
    await expect(page.getByText(/일차 저장됨/)).toBeVisible({ timeout: 15_000 });

    // 🔴 set_details 컬럼에 실제로 들어갔는지 — 화면 복원만 보면 로컬 상태일 수도 있다.
    const saved = await dbQuery<{ set_details: unknown }>(
      `select set_details from public.routine_exercises
        where user_id=${uid} and set_details is not null limit 1`,
      [email],
    );
    expect(saved.length).toBe(1);
    expect(JSON.stringify(saved[0].set_details)).toContain("60");

    // 새로고침해도 남아 있어야 한다(쓰기만 되고 읽기가 빠진 경우를 잡는다).
    await page.goto("/plan", { waitUntil: "networkidle" });
    const persisted = await page
      .locator('input[aria-label$="세트 무게(kg)"]')
      .evaluateAll((els) => (els as HTMLInputElement[]).map((e) => e.value));
    expect(persisted.slice(0, 3)).toEqual(want);
  });
});
