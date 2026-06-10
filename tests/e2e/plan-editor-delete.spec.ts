import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";

// 운동 등록(/plan) 편집기:
//  - 개별 운동 삭제 버튼이 실제로 그 행을 지워야 한다(과거엔 state 키를 잘못 써서
//    삭제가 안 먹었다 — update(f.focus) → update(f.key) 로 수정).
//  - '전체 운동 초기화' 버튼이 모든 부위의 담은 운동을 비워야 한다.

test("개별 운동 삭제 버튼이 그 행을 실제로 지운다", async ({ page }) => {
  await signUpAndOnboard(page);
  await page.goto("/plan", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // '운동 추가' 버튼이 있는 첫 부위 섹션을 잡는다.
  const section = page
    .locator("section")
    .filter({ has: page.getByRole("button", { name: "운동 추가" }) })
    .first();
  await expect(section).toBeVisible();

  // 운동 2개 추가
  await section.getByRole("button", { name: "운동 추가" }).click();
  await section.getByRole("button", { name: "운동 추가" }).click();

  const deleteButtons = section.getByRole("button", { name: "삭제" });
  await expect(deleteButtons).toHaveCount(2);

  // 1개 삭제 → 1개 남아야 한다 (버그 시엔 그대로 2개)
  await deleteButtons.first().click();
  await expect(deleteButtons).toHaveCount(1);

  // 나머지도 삭제 → 0개
  await deleteButtons.first().click();
  await expect(section.getByRole("button", { name: "삭제" })).toHaveCount(0);
});

test("전체 운동 초기화가 모든 부위의 담은 운동을 비운다", async ({ page }) => {
  await signUpAndOnboard(page);
  await page.goto("/plan", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const section = page
    .locator("section")
    .filter({ has: page.getByRole("button", { name: "운동 추가" }) })
    .first();
  await section.getByRole("button", { name: "운동 추가" }).click();
  await section.getByRole("button", { name: "운동 추가" }).click();
  await expect(section.getByRole("button", { name: "삭제" })).toHaveCount(2);

  // 전체 초기화 → 확인 모달 → 전체 비우기
  await page.getByTestId("clear-all-exercises").click();
  await page.getByRole("button", { name: "전체 비우기" }).click();

  // 모든 섹션의 삭제 버튼(=행)이 사라져야 한다
  await expect(page.getByRole("button", { name: "삭제" })).toHaveCount(0);
});