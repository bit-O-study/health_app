import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { hasDb } from "./helpers/db";
import { fakeGps, holdToEnd, runSteps, spoken } from "./helpers/running";

/**
 * 런닝 모드 고도화 3단계 · 목표·안내(2026-09-29 런닝 모드 고도화 검수보고서 R6·R8, 결정 1·2).
 * 목표 고르기(기억) · 진행 막대 · 1km 음성·진동(기본 켜짐) · 목표 달성 안내 ·
 * 종료 한 줄 요약 + 기록 자세히 보기(그 런닝 상세로) · 개인 최고 배지(첫 런닝은 없음).
 */

async function openIntro(page: Page) {
  await page.goto("/running?mode=outdoor", { waitUntil: "networkidle" });
  await expect(page.getByRole("group", { name: "런닝 목표" })).toBeVisible();
}

async function startRun(page: Page) {
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByRole("button", { name: "꾹 눌러 종료" })).toBeVisible({ timeout: 10_000 });
}

test("목표 3km — 진행 막대 · 1km 음성 안내 · 목표 달성 · 종료 요약과 기록 링크 · 두 번째 런닝 개인 최고", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(240_000);
  await fakeGps(page, { speech: true });
  await signUpAndOnboard(page);

  // 음성 안내는 기본 켜짐, 목표는 고르면 기억된다.
  await openIntro(page);
  await expect(page.getByRole("checkbox", { name: /음성 안내/ })).toBeChecked();
  await page.getByRole("group", { name: "런닝 목표" }).getByRole("button", { name: "3km" }).click();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("group", { name: "런닝 목표" }).getByRole("button", { name: "3km" })).toHaveAttribute("aria-pressed", "true");

  // ── 첫 런닝: 1.1km(개인 최고 배지 없음)
  await startRun(page);
  const bar = page.getByRole("progressbar", { name: "목표 3km" });
  await expect(bar).toHaveAttribute("aria-valuenow", "0");
  await runSteps(page, 11);
  await expect.poll(async () => Number(await bar.getAttribute("aria-valuenow"))).toBeGreaterThanOrEqual(33);
  await expect(page.getByTestId("run-goal")).toContainText("목표까지");
  // GPS 모의 시간 100초에 브라우저의 실제 경과 시간도 더해진다.
  // 정확한 시간 문구 계산은 run-guide 단위 테스트에서 고정값으로 검증한다.
  const said = await spoken(page);
  expect(said.some((t) => /^1킬로미터\. 구간 1분 4\d초\. 평균 1분 4\d초\. 목표까지 2킬로미터\.$/.test(t))).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { __buzz: number }).__buzz)).toBeGreaterThan(0);

  await holdToEnd(page);
  await expect(page.getByTestId("run-finish-line")).toContainText(/^1\.\d\dkm · \d+:\d\d · 평균 1'\d\d"$/);
  await expect(page.getByTestId("run-save-state")).toHaveAttribute("data-state", "saved", { timeout: 20_000 });
  await expect(page.getByRole("list", { name: "개인 최고 기록" })).toHaveCount(0);
  const link = page.getByRole("link", { name: "기록 자세히 보기" });
  await expect(link).toHaveAttribute("href", /^\/routine\/running-records\/[0-9a-f-]{36}$/);

  // ── 두 번째 런닝: 3km 넘게 → 목표 달성 안내 + 가장 긴 거리 배지
  await page.getByRole("button", { name: "확인" }).click();
  await startRun(page);
  await runSteps(page, 31);
  await expect.poll(async () => (await spoken(page)).some((t) => t === "목표 3킬로미터 달성! 잘했어요.")).toBe(true);
  await holdToEnd(page);
  await expect(page.getByTestId("run-save-state")).toHaveAttribute("data-state", "saved", { timeout: 20_000 });
  await expect(page.getByRole("list", { name: "개인 최고 기록" })).toContainText("가장 긴 거리");

  // 기록 자세히 보기 → 방금 그 런닝의 상세
  await page.getByRole("link", { name: "기록 자세히 보기" }).click();
  await expect(page).toHaveURL(/\/routine\/running-records\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /야외 런닝/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "런닝 요약" })).toContainText(/3\.\d\dkm/);
});

test("음성 안내를 끄면 말하지 않는다(진동은 그대로)", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(120_000);
  await fakeGps(page, { speech: true });
  await signUpAndOnboard(page);
  await openIntro(page);
  await page.getByRole("checkbox", { name: /음성 안내/ }).uncheck();
  await startRun(page);
  await runSteps(page, 11);
  await page.waitForTimeout(500);
  expect(await spoken(page)).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { __buzz: number }).__buzz)).toBeGreaterThan(0);
  // 달리는 중에도 켜고 끌 수 있다
  await expect(page.getByRole("button", { name: "음성 켜기" })).toBeVisible();
});
