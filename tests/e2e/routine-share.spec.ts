import { expect, test } from "@playwright/test";

import { seedRecommendedExercises, createOnboardedAccount } from "./helpers/auth";
import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 루틴 소개(하루치 루틴 공유) 왕복 —
 * 커뮤니티 루틴 탭에서 1일차 추천글 작성 → 상세에서 '내 루틴에 담기' →
 * 일차 **줄을 누르면 바로** 담긴다(비어 있으면 즉시, 차 있으면 덮어쓰기 확인 1회).
 */
test("내 일차를 소개하고, 커뮤니티 루틴 탭에서 다시 내 루틴에 담는다", async ({
  page,
}) => {
  await createOnboardedAccount(page);
  await seedRecommendedExercises(page);

  // ── 1) 커뮤니티 루틴 탭에서 1일차 추천글 쓰기 ───────────────────────
  await page.goto("/community", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "루틴", exact: true }).click();
  await page.getByRole("button", { name: "루틴 추천글 쓰기" }).click();
  await expect(page.getByText("내 루틴 추천글 쓰기")).toBeVisible();
  // 줄 이름은 "1일차 · <부위> 추천글 쓰기" — 부위는 온보딩 루틴에 따라 달라진다.
  await page.getByRole("button", { name: /^1일차 · .+ 추천글 쓰기$/ }).click();
  const sheet = page.locator("div").filter({ hasText: /^이 일차를 소개하기/ }).last();
  await expect(page.getByText("이 일차를 소개하기")).toBeVisible();

  // 제목은 자동으로 채워지지 않고, 비어 있으면 '올리기' 를 못 누른다.
  const title = page.getByLabel(/제목/).or(sheet.locator("input").first());
  const submit = page.getByRole("button", { name: "올리기" });
  await expect(title).toHaveValue("");
  await expect(submit).toBeDisabled();
  await title.fill("   ");
  await expect(submit).toBeDisabled();

  // 실행마다 다른 제목 — 같은 실행의 앞선 계정 글(teardown 전)과 카드가 겹치지 않게.
  const shareTitle = `E2E 소개 루틴 ${Date.now().toString(36)}`;
  await title.fill(shareTitle);
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page.getByText("소개글을 올렸어요")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "확인" }).click();
  // 모달을 닫으면 쌓아 둔 히스토리 항목을 다음 틱에 history.back() 으로 뺀다(useBackClose).
  // 곧바로 page.goto 하면 늦게 도착한 back 이 그 이동을 끊는다(ERR_ABORTED) — 닫힘이 끝난 뒤 이동.
  await expect(page.getByText("소개글을 올렸어요")).toBeHidden();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);

  // ── 2) 커뮤니티 '루틴' 탭에 뜬다 ────────────────────────────────────
  await page.goto("/community", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "루틴", exact: true }).click();

  const card = page.getByRole("button").filter({ hasText: shareTitle });
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

  // 일차 선택 시트 안에서만 찾는다 — 피드 카드 제목도 "1일차 · …" 일 수 있다(라이브 데이터).
  const picker = page
    .getByRole("heading", { name: "어느 일차에 담을까요?" })
    .locator("xpath=..");
  const dayRow = picker.getByRole("button").filter({ hasText: /^1일차 · / });
  await dayRow.first().click();

  // 1일차엔 이미 운동이 있으니 덮어쓰기 확인을 한 번 받는다.
  await expect(page.getByText(/덮어쓸까요\?/)).toBeVisible();
  await page.getByRole("button", { name: "덮어쓰기" }).click();

  // 담긴 뒤 시트가 닫히고, 내 루틴 1일차에 운동이 그대로 남아 있다.
  await expect(page.getByText("어느 일차에 담을까요?")).toBeHidden({
    timeout: 15_000,
  });
  // 시트를 닫으면 쌓아 둔 히스토리 항목을 다음 틱에 back() 으로 뺀다 — 끝난 뒤 이동.
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  await page.goto("/plan", { waitUntil: "networkidle" });
  await expect(
    page.locator("[data-plan-day-index='0']").locator("select").first(),
  ).toBeVisible();
});

test("남의 루틴 — 내 헬스장에 없는 기구는 헬스장 기구 중 무엇으로 바꿀지 보여 준다(2026-10-08)", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(120_000);
  const { user_id } = await createTestAccount(page.context(), baseURL!, false);
  // 덤벨만 있는 헬스장으로 등록(개인 기구 목록).
  const gym = await dbQuery<{ id: string }>(`select id from public.gyms limit 1`);
  test.skip(gym.length === 0, "no gym rows");
  await dbQuery(`update public.profiles set gym_id=$2, gym_equipment_ids=array['dumbbell'] where user_id=$1`, [user_id, gym[0].id]);
  const title = `헬스장대체 ${Date.now()}`;
  await dbQuery(
    `insert into public.routine_shares (user_id, author_name, title, focus_blocks, exercises)
     values ($1, '테스트', $2, '["back"]'::jsonb, $3::jsonb)`,
    [user_id, title, JSON.stringify([
      { focus: "back", position: 0, exercise_id: "lat-pulldown", equipment: "machine", sets: 4, reps: 10, weight_kg: null, memo: null },
      { focus: "back", position: 1, exercise_id: "one-arm-dumbbell-row", equipment: "dumbbell", sets: 3, reps: 12, weight_kg: null, memo: null },
    ])],
  );

  await page.goto("/community", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "루틴", exact: true }).click();
  await page.getByRole("button").filter({ hasText: title }).first().click();
  const notes = page.getByTestId("gym-swap");
  // 랫풀다운(머신)만 대체가 붙고, 덤벨 운동에는 안 붙는다.
  await expect(notes).toHaveCount(1, { timeout: 15_000 });
  await expect(notes.first()).toContainText("내 헬스장엔 이 기구가 없어요");
  await expect(notes.first()).toContainText("같은 근육");
});
