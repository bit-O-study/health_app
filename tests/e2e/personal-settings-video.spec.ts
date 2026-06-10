import { expect, test, type Locator, type Page } from "@playwright/test";

import { seedRecommendedExercises, signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 개인설정 '운동영상 안 보기' + 운동 1개 완료마다 누적 시간 자동저장.

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

/** 행을 오른쪽으로 스와이프 → 완료 토글. */
async function swipeRightDone(page: Page, row: Locator) {
  await row.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const box = await row.boundingBox();
  if (!box) throw new Error("행 위치를 찾지 못함");
  const y = box.y + box.height / 2;
  const x0 = box.x + box.width * 0.25;
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(x0 + i * 16, y, { steps: 2 });
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await page.waitForTimeout(700);
}

test("운동영상 안 보기 ON → 가이드 없이 타이머만 + 운동 완료 시 시간 자동저장", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedRecommendedExercises(page); // 오늘 운동 채움(가이드 큐 생성)

  // 개인설정에서 '운동영상 안 보기' 켜기
  await page.goto("/settings/personal", { waitUntil: "networkidle" });
  await page.getByRole("switch", { name: "운동영상 안 보기" }).click();
  await page.waitForTimeout(800);

  // DB 에 반영됐는지
  const pref = await dbQuery<{ hide: boolean }>(
    `select hide_exercise_videos as hide from public.profiles where user_id=${uid}`,
    [email],
  );
  expect(pref[0]?.hide).toBe(true);

  // 메인으로 → 운동 시작
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(800);

  // 영상 가이드(오버레이)가 뜨면 안 된다 — '넘기기' 버튼이 없어야 함.
  await expect(page.getByRole("button", { name: "넘기기" })).toHaveCount(0);
  // 대신 정지/저장 버튼(타이머)이 보여야 한다.
  await expect(
    page.getByRole("button", { name: "정지하고 시간 저장" }),
  ).toBeVisible();

  // 1초 이상 경과 후 본운동 1개 완료(스와이프) → 그날 누적 시간이 저장돼야 한다.
  await page.waitForTimeout(1600);
  const firstRow = page
    .locator("li")
    .filter({ has: page.locator("h3") })
    .first();
  await swipeRightDone(page, firstRow);
  // 스와이프가 '완료'로 인식됐는지 먼저 확인(자동저장의 선행조건).
  await expect(firstRow.getByText("완료", { exact: true }).first()).toBeVisible({
    timeout: 5_000,
  });
  await page.waitForTimeout(1000);

  const sess = await dbQuery<{ sec: number }>(
    `select duration_sec as sec from public.workout_sessions
       where user_id=${uid} and for_date=${today}`,
    [email],
  );
  expect(sess.length).toBe(1);
  expect(Number(sess[0].sec)).toBeGreaterThanOrEqual(1);
});

test("기본(영상 보기) 모드에선 운동 시작 시 가이드가 뜬다", async ({ page }) => {
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1000);

  // 가이드 오버레이가 열렸다 — '넘기기' 버튼이 보인다.
  await expect(
    page.getByRole("button", { name: "넘기기" }).first(),
  ).toBeVisible({ timeout: 10_000 });
});
