import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { hasDb } from "./helpers/db";

// 회귀: 저장된 모드가 있으면 '/'(모드 선택)는 '모드를 선택해주세요'를 보여주지 않고
// 바로 /routine 으로 간다. (과거: 모드선택 화면이 잠깐 떴다가 풀 리로드로 넘어가
// '제일 초기화면 갔다 들어오는' 느낌 → 모드선택 안 그림 + 소프트 내비로 수정.)

test("저장된 모드가 있으면 / 가 모드선택 깜빡임 없이 /routine 으로 간다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  // 모드 저장(루틴).
  await page.evaluate(() =>
    window.localStorage.setItem("training.mode.v1", "routine"),
  );

  await page.goto("/", { waitUntil: "networkidle" });

  // 결국 /routine 으로 가고, 모드 선택 문구는 보이지 않아야 한다.
  await expect(page).toHaveURL(/\/routine(\?|$)/, { timeout: 8000 });
  await expect(page.getByText("모드를 선택해주세요")).toHaveCount(0);
});
