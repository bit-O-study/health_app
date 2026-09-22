import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { silenceDevOverlay } from "./helpers/dev-overlay";
import { hasDb } from "./helpers/db";

/**
 * 런처형 홈 (2026-09-20).
 *
 * 지키려는 약속:
 *  ① 홈은 앱 아이콘 판이고, 앱을 누르면 화면도 하단바도 그 앱 것으로 바뀐다.
 *  ② **가운데 칸은 어느 앱에서도 홈**이다 — 자리가 안 움직인다.
 *  ③ **운동 기능이 길을 잃지 않는다** — 하단바 4칸은 입구일 뿐이고,
 *     나머지는 예전처럼 화면 안에서 들어갈 수 있어야 한다(사용자 요구).
 */

test("런처: 앱을 누르면 하단바가 그 앱 메뉴로 갈린다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await silenceDevOverlay(page);
  await createOnboardedAccount(page);
  await page.goto("/home", { waitUntil: "networkidle" });

  const grid = page.getByRole("navigation", { name: "앱" });
  const nav = page.getByRole("navigation", { name: "주요 메뉴" });
  await expect(grid).toBeVisible({ timeout: 10_000 });

  // 런처 자신의 4칸 — 체형·기록·[홈]·알림·나
  await expect(nav.getByRole("link")).toHaveCount(5);
  await expect(nav.getByRole("link").nth(2)).toHaveText("홈");

  // 🔴 런처 칸은 남의 앱으로 넘어가지 않는다 — 눌러도 하단바가 그대로여야 한다
  //    (예전 '검색'이 /exercises 로 가서 운동 앱 바로 갈리던 회귀).
  const launcherLabels = await nav.getByRole("link").allInnerTexts();
  await nav.getByRole("link").nth(0).click();
  await expect(nav.getByRole("link").nth(2)).toHaveText("홈");
  expect(await nav.getByRole("link").allInnerTexts()).toEqual(launcherLabels);
  await nav.getByRole("link").nth(2).click();
  await expect(page).toHaveURL(/\/home$/);

  await grid.getByRole("link", { name: "운동", exact: true }).click();
  await expect(page).toHaveURL(/\/routine$/);
  await expect(nav.getByRole("link").nth(0)).toHaveText("오늘");
  await expect(nav.getByRole("link").nth(3)).toHaveText("운동찾기");

  // 캘린더로 갈아타면 또 다른 칸 구성(3칸 — 달력·[홈]·주기).
  await nav.getByRole("link").nth(2).click();
  await expect(page).toHaveURL(/\/home$/);
  await grid.getByRole("link", { name: "캘린더", exact: true }).click();
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(nav.getByRole("link")).toHaveCount(3);
  await expect(nav.getByRole("link").nth(0)).toHaveText("달력");
  await expect(nav.getByRole("link").nth(1)).toHaveText("홈");
  await expect(nav.getByRole("link").nth(2)).toHaveText("주기");

  // 🔴 화면이 하나뿐인 앱(식단)은 없는 칸을 만들지 않고 런처 바를 그대로 쓴다.
  await nav.getByRole("link", { name: "홈", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  const launcherBar = await nav.getByRole("link").allInnerTexts();
  await grid.getByRole("link", { name: "식단", exact: true }).click();
  await expect(page).toHaveURL(/\/diet$/);
  expect(await nav.getByRole("link").allInnerTexts()).toEqual(launcherBar);
});

test("가운데 홈은 어느 앱에서도 같은 자리·같은 모양이다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await page.setViewportSize({ width: 390, height: 844 });
  await silenceDevOverlay(page);
  await createOnboardedAccount(page);

  const nav = page.getByRole("navigation", { name: "주요 메뉴" });
  const centers: number[] = [];

  // 앱마다 칸 수가 다르다(3칸·5칸) — 그래도 홈은 언제나 한가운데여야 한다.
  for (const path of ["/home", "/routine", "/diet", "/calendar", "/community"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    const count = await nav.getByRole("link").count();
    expect([3, 5], `${path} 칸 수 ${count}`).toContain(count);
    const home = nav.getByRole("link").nth((count - 1) / 2);
    await expect(home, path).toHaveText("홈");
    const box = (await home.boundingBox())!;
    centers.push(Math.round(box.x + box.width / 2));
  }

  // 다섯 화면 모두 홈 버튼의 한가운데가 같은 가로 위치여야 한다(1px 오차 허용).
  for (const c of centers) {
    expect(Math.abs(c - centers[0])).toBeLessThanOrEqual(1);
  }
});

test("운동 기능이 새 구조에서 하나도 사라지지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(180_000);
  await silenceDevOverlay(page);
  await createOnboardedAccount(page);

  // 하단바에 있는 입구 4곳.
  const nav = page.getByRole("navigation", { name: "주요 메뉴" });
  await page.goto("/routine", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "오늘의 운동" })).toBeVisible({
    timeout: 15_000,
  });

  await nav.getByRole("link", { name: "루틴", exact: true }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole("heading", { name: "운동 등록" })).toBeVisible();

  await nav.getByRole("link", { name: "운동찾기", exact: true }).click();
  // dev 서버는 이 라우트를 처음 들어갈 때 그 자리에서 컴파일한다(운동 카탈로그 + 자연어
  // 찾기까지 들어 있어 몇십 초 걸릴 수 있다). 기본 15초로는 모자라 가끔 빨갰다.
  await expect(page).toHaveURL(/\/exercises$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "운동 종목" })).toBeVisible();

  await nav.getByRole("link", { name: "기록", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/progress$/);
  await expect(page.getByRole("heading", { name: "성장 그래프" })).toBeVisible();

  // 하단바에 없는 기능들 — 예전처럼 직접 들어갈 수 있어야 한다.
  // (이 화면들은 지금도 하단바에 없었다. 런처로 바뀌었다고 사라지면 안 된다.)
  for (const [path, heading] of [
    ["/plan/muscle", "근육별로 운동선택"],
    ["/plan/today", "오늘만 운동 바꾸기"],
    ["/settings/score", "내 운동 점수"],
    ["/settings/routine", null],
  ] as const) {
    await page.goto(path, { waitUntil: "networkidle" });
    expect(page.url(), `${path} 가 다른 곳으로 튕겼다`).toContain(path);
    if (heading) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible({
        timeout: 10_000,
      });
    }
  }

  // 운동 앱에 속한 화면은 어디서나 하단바가 운동 메뉴다(홈은 가운데 그대로).
  await page.goto("/plan/muscle", { waitUntil: "networkidle" });
  await expect(nav.getByRole("link").nth(2)).toHaveText("홈");
  await expect(nav.getByRole("link").nth(1)).toHaveText("루틴");
});
