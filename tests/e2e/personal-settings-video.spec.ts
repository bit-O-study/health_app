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

test("영상 보기: 운동모드 안엔 시간만, 나오면 '다시 운동하기'만", async ({
  page,
}) => {
  await signUpAndOnboard(page);
  await seedRecommendedExercises(page);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);

  // 운동모드(가이드 오버레이): '넘기기'는 있고, 경과 시간(mm:ss)이 보인다.
  await expect(
    page.getByRole("button", { name: "넘기기" }).first(),
  ).toBeVisible({ timeout: 10_000 });
  const timeText = () =>
    page.getByText(/^\d{1,2}:\d{2}$/).first().innerText();
  const toSec = (t: string) => {
    const [m, s] = t.split(":").map(Number);
    return m * 60 + s;
  };
  await expect(page.getByText(/^\d{1,2}:\d{2}$/).first()).toBeVisible();
  // 운동모드 안엔 중단하기/운동 다시 시작하기 버튼이 없다(시간만).
  await expect(page.getByRole("button", { name: "중단하기" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "운동 다시 시작하기" }),
  ).toHaveCount(0);
  const before = toSec(await timeText());

  // 운동모드에서 나오기: 닫기 → '중단' 확인 → 시간 정지.
  await page.getByRole("button", { name: "닫기" }).first().click();
  await page.getByRole("button", { name: "중단", exact: true }).click();
  await page.waitForTimeout(600);

  // 나오면: 넘기기/중단하기는 사라지고 '다시 운동하기' 버튼만.
  await expect(page.getByRole("button", { name: "넘기기" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "중단하기" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "다시 운동하기" }),
  ).toBeVisible();

  // 닫힌 동안(정지) 시간이 흐르면 안 된다 — 3초 기다려도 그대로.
  await page.waitForTimeout(3000);

  // '다시 운동하기' → 운동모드 재진입(가이드 다시 열림) + 시간 재개.
  await page.getByRole("button", { name: "다시 운동하기" }).click();
  await expect(
    page.getByRole("button", { name: "넘기기" }).first(),
  ).toBeVisible({ timeout: 10_000 });
  // 정지돼 있었으므로 재진입 직후 시간은 닫기 전과 거의 같다(+1초 이내).
  const after = toSec(await timeText());
  expect(after - before).toBeLessThanOrEqual(1);

  // 재개됐는지 — 2초 흐른 뒤 시간이 늘어난다.
  await page.waitForTimeout(2000);
  const later = toSec(await timeText());
  expect(later).toBeGreaterThan(after);
});
