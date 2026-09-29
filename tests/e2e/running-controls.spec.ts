import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";
import { fakeGps, holdToEnd, runCall } from "./helpers/running";

/**
 * 런닝 모드 고도화 2단계 · 달리는 중 기본기(2026-09-28 런닝 모드 고도화 검수보고서 R4·R5·R6·R7).
 * 카운트다운 · 캐릭터 기본 끔 · 수동/자동 일시정지(시간·거리 멈춤, 저장 시간에서도 빠짐) ·
 * 꾹 눌러 종료 · 화면 켜짐 유지 · GPS 신호 막대.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;

async function timeText(page: Page) {
  return page.getByText("시간", { exact: true }).locator("xpath=preceding-sibling::span[1]").innerText();
}

async function startOutdoor(page: Page) {
  await page.goto("/running?mode=outdoor", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "시작하기" }).click();
  // 3초 카운트다운 뒤 시작
  await expect(page.getByTestId("run-countdown")).toBeVisible();
  await expect(page.getByRole("button", { name: "꾹 눌러 종료" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("run-countdown")).toHaveCount(0);
}

async function moveTwice(page: Page) {
  await runCall(page, "__advanceRunTime", 10_000);
  await runCall(page, "__pushRunPosition", 126.9785); // 약 44m / 10초 → 달리는 속도
  await page.waitForTimeout(600);
  await runCall(page, "__advanceRunTime", 10_000);
  await runCall(page, "__pushRunPosition", 126.979);
  await page.waitForTimeout(600);
}

test("카운트다운 · 캐릭터 기본 끔 · 화면 켜짐 · GPS 신호 · 꾹 눌러 종료", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await fakeGps(page, { wakeLock: true });
  await signUpAndOnboard(page);
  await startOutdoor(page);

  // 캐릭터(3D)는 기본 끔 — 캔버스 없음. 켜면 그려지고 기기에 기억.
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "캐릭터 켜기" }).click();
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => localStorage.getItem("heltch.running.scene"))).toBe("on");
  await page.getByRole("button", { name: "캐릭터 끄기" }).click();
  await expect(page.locator("canvas")).toHaveCount(0);

  // 화면 켜짐 유지 요청 · GPS 신호(방금 받은 정확도 5m 위치 → 좋음. 5초 넘게 없으면 '없음')
  await runCall(page, "__pushRunPosition", 126.978);
  expect(await page.evaluate(() => (window as unknown as { __wakeLockRequests: number }).__wakeLockRequests)).toBeGreaterThan(0);
  await expect(page.getByTestId("gps-signal")).toHaveAttribute("data-level", "3");

  // 스치듯 누르면 안 끝난다 — 안내만.
  await page.getByRole("button", { name: "꾹 눌러 종료" }).click();
  await expect(page.getByText("꾹 누르고 있으면 끝나요")).toBeVisible();
  await expect(page.getByRole("button", { name: "꾹 눌러 종료" })).toBeVisible();

  // 꾹 누르면 끝난다.
  await holdToEnd(page);
  await expect(page.getByRole("heading", { name: /런닝 (완료|종료)/ })).toBeVisible();
  // 종료 화면엔 3D 를 그리지 않는다(배터리).
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("수동 일시정지는 시간을 멈추고, 저장되는 시간에서도 빠진다 · 자동 일시정지는 움직이면 이어진다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(180_000);
  await fakeGps(page);
  const email = await signUpAndOnboard(page);
  await startOutdoor(page);
  await moveTwice(page);

  // 수동 일시정지 → 2분이 흘러도 시간이 그대로
  await page.getByRole("button", { name: "일시정지" }).click();
  await expect(page.getByTestId("run-paused")).toHaveAttribute("data-kind", "manual");
  await page.waitForTimeout(1200);
  const frozen = await timeText(page);
  await runCall(page, "__advanceRunTime", 120_000);
  await page.waitForTimeout(1500);
  expect(await timeText(page)).toBe(frozen);
  // 멈춘 동안 멀리 이동해도 거리에 안 들어간다
  const distBefore = await page.getByText("KM", { exact: true }).locator("xpath=preceding-sibling::span[1]").innerText();
  await runCall(page, "__pushRunPosition", 126.99);
  await page.waitForTimeout(600);
  expect(await page.getByText("KM", { exact: true }).locator("xpath=preceding-sibling::span[1]").innerText()).toBe(distBefore);

  await page.getByRole("button", { name: "다시 시작" }).click();
  await expect(page.getByTestId("run-paused")).toHaveCount(0);

  // 다시 달리다 10초 넘게 움직임이 없으면 자동 일시정지
  await runCall(page, "__advanceRunTime", 10_000);
  await runCall(page, "__pushRunPosition", 126.9905);
  await page.waitForTimeout(600);
  await runCall(page, "__advanceRunTime", 10_000);
  await runCall(page, "__pushRunPosition", 126.991);
  await page.waitForTimeout(600);
  await runCall(page, "__advanceRunTime", 12_000);
  await expect(page.getByTestId("run-paused")).toHaveAttribute("data-kind", "auto", { timeout: 5_000 });
  // 다시 움직이면 스스로 이어진다
  await runCall(page, "__advanceRunTime", 10_000);
  await runCall(page, "__pushRunPosition", 126.9915);
  await expect(page.getByTestId("run-paused")).toHaveCount(0, { timeout: 5_000 });

  await runCall(page, "__advanceRunTime", 30_000);
  await page.waitForTimeout(1200);
  await holdToEnd(page);
  await expect
    .poll(async () => (await dbQuery<{ n: number }>(`select count(*)::int as n from public.run_sessions where user_id=${uid}`, [email]))[0].n, { timeout: 20_000 })
    .toBe(1);
  const [row] = await dbQuery<{ duration_sec: number }>(`select duration_sec from public.run_sessions where user_id=${uid}`, [email]);
  // 흐른 시간은 3분이 넘지만(수동 일시정지 2분 포함), 저장되는 건 달린 시간뿐
  expect(row.duration_sec).toBeGreaterThanOrEqual(60);
  expect(row.duration_sec).toBeLessThan(120);
});
