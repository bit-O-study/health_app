import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";

/**
 * 루틴 소개(하루치 루틴 공유) 왕복 —
 * 운동 등록에서 1일차를 소개 → 커뮤니티 '루틴' 탭에 뜸 → 상세에서 '내 루틴에 담기' →
 * 일차 **줄을 누르면 바로** 담긴다(비어 있으면 즉시, 차 있으면 덮어쓰기 확인 1회).
 */
test("내 일차를 소개하고, 커뮤니티 루틴 탭에서 다시 내 루틴에 담는다", async ({
  page,
}) => {
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  // ── 1) 운동 등록에서 1일차 소개하기 ──────────────────────────────────
  await page.goto("/plan", { waitUntil: "networkidle" });
  const firstDay = page.locator("[data-plan-day-index='0']");
  await expect(firstDay).toBeVisible();

  await firstDay.getByRole("button", { name: "소개하기" }).click();
  const sheet = page.locator("div").filter({ hasText: /^이 일차를 소개하기/ }).last();
  await expect(page.getByText("이 일차를 소개하기")).toBeVisible();

  // 제목은 "1일차 · <부위>" 로 미리 채워져 있다 — 알아보기 쉽게 바꿔서 올린다.
  const title = page.getByLabel(/제목/).or(sheet.locator("input").first());
  await title.fill("E2E 소개 루틴");
  await page.getByRole("button", { name: "올리기" }).click();

  await expect(page.getByText("소개글을 올렸어요")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "확인" }).click();

  // ── 2) 커뮤니티 '루틴' 탭에 뜬다 ────────────────────────────────────
  await page.goto("/community", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "루틴", exact: true }).click();

  const card = page.getByRole("button").filter({ hasText: "E2E 소개 루틴" });
  await expect(card).toBeVisible({ timeout: 15_000 });
  // 카드에 운동 개수와 순서 미리보기가 보인다(목록에서 성격이 읽혀야 한다).
  await expect(card.getByText(/운동 \d+개/)).toBeVisible();

  // ── 3) 상세 → 담기 → 일차 줄 클릭으로 바로 적용 ─────────────────────
  await card.click();
  await expect(page.getByRole("button", { name: "내 루틴에 담기" })).toBeVisible();
  await page.getByRole("button", { name: "내 루틴에 담기" }).click();

  await expect(page.getByText("어느 일차에 담을까요?")).toBeVisible();
  // 줄 = 버튼. 고른 뒤 또 '담기'를 누르는 두 번 손이 없어야 한다.
  await expect(
    page.getByRole("button", { name: /^\d+일차에 담기$/ }),
  ).toHaveCount(0);

  const dayRow = page.getByRole("button").filter({ hasText: /^1일차 · / });
  await dayRow.first().click();

  // 1일차엔 이미 운동이 있으니 덮어쓰기 확인을 한 번 받는다.
  await expect(page.getByText(/덮어쓸까요\?/)).toBeVisible();
  await page.getByRole("button", { name: "덮어쓰기" }).click();

  // 담긴 뒤 시트가 닫히고, 내 루틴 1일차에 운동이 그대로 남아 있다.
  await expect(page.getByText("어느 일차에 담을까요?")).toBeHidden({
    timeout: 15_000,
  });
  await page.goto("/plan", { waitUntil: "networkidle" });
  await expect(
    page.locator("[data-plan-day-index='0']").locator("select").first(),
  ).toBeVisible();
});
