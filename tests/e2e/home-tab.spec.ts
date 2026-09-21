import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { silenceDevOverlay } from "./helpers/dev-overlay";
import { hasDb } from "./helpers/db";

// #12: 운동탭 왼쪽에 '홈' 탭 신설 — 홈에 설정 진입점, 운동탭에선 설정 제거.
// 2026-09-20 런처 전환 — 홈 탭은 왼쪽 끝이 아니라 **하단바 한가운데 고정석**이 됐다.
// 다짐·잔디는 홈에서 각 앱(펫·캘린더) 안으로 옮겨 갔으므로 여기서 더 보지 않는다.

test("홈: 가운데 홈 칸과 설정이 있고, 운동탭엔 설정이 없다(#12)", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await silenceDevOverlay(page);
  await createOnboardedAccount(page);

  await page.goto("/home", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const nav = page.getByRole("navigation", { name: "주요 메뉴" });
  // 홈 칸은 3번째(가운데) — 앱이 바뀌어도 이 자리는 안 움직인다.
  await expect(nav.getByRole("link")).toHaveCount(5);
  await expect(nav.getByRole("link").nth(2)).toHaveText("홈");
  // 홈에 있을 땐 그 칸이 현재 위치로 표시된다.
  await expect(nav.getByRole("link").nth(2)).toHaveAttribute("aria-current", "page");

  // 설정 진입점은 하단바 '나' 칸 하나다(2026-09-21) — 예전엔 머리글 설정 아이콘과
  // 겹쳐 한 화면에 같은 곳으로 가는 버튼이 둘이었다.
  const me = nav.getByRole("link", { name: "나", exact: true });
  await expect(me).toHaveAttribute("href", "/settings");
  await expect(page.getByRole("link", { name: "설정", exact: true })).toHaveCount(0);

  // 운동탭(/routine) 으로 이동 — 실제 운동탭에 도달했는지 확인.
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await expect(
    page.getByRole("heading", { name: "오늘의 운동" }),
  ).toBeVisible({ timeout: 10000 });
  // 헤더에 설정 아이콘(aria-label 정확히 '설정')이 없어야 한다(홈으로 옮김).
  await expect(
    page.getByRole("link", { name: "설정", exact: true }),
  ).toHaveCount(0);

  // 운동 앱 하단바 — 양옆 4칸이 운동 메뉴로 갈리고, 가운데는 여전히 홈.
  await expect(nav.getByRole("link").nth(0)).toHaveText("오늘");
  await expect(nav.getByRole("link").nth(1)).toHaveText("루틴");
  await expect(nav.getByRole("link").nth(2)).toHaveText("홈");
  await expect(nav.getByRole("link").nth(3)).toHaveText("운동찾기");
  await expect(nav.getByRole("link").nth(4)).toHaveText("기록");

  // 가운데 홈 1탭으로 런처 복귀.
  await nav.getByRole("link").nth(2).click();
  await expect(page).toHaveURL(/\/home$/);
});
