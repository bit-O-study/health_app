import { expect, test, type Page } from "@playwright/test";

import motionDarkIds from "../../public/exercise-guides/ai-v3/manifest-dark.json";
import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 회귀: 운동모드(가이드)의 **누끼 v3 시범 영상은 테마별 두 벌**이다 —
 * 라이트 `ID.mp4`, 다크 `ID-dark.mp4`. 운동모드 배경색(#fafafa / #09090b)에 녹이려고
 * 검은 박스·테두리도 두르지 않는다.
 *
 * 지금까지 이 전환은 화면 캡처로만 확인해 왔다(2026-09-18). 여기서 회귀로 고정한다.
 * 한 벌이 빠지면(= manifest-dark 누락, 파일 삭제, darkUrl 연결 끊김) 이 테스트가 잡는다.
 *
 * ⚠ 테마는 OS 설정이 아니라 `localStorage['heltch.theme']` 로 정해진다(미설정 = 다크).
 *   ThemeScript 가 **첫 페인트 전에** 클래스를 붙이므로, 테마를 바꾸려면 저장 후 다시 들어가야 한다.
 *   운동모드는 별도 라우트가 아니라 루틴 화면 위 오버레이라 reload 로는 유지되지 않는다.
 */

// 하체·바벨 종목이면서 manifest-dark 에 들어 있는 것. 아래 가드가 전제를 지킨다.
const EXERCISE = "high-bar-squat";
const EQUIPMENT = "barbell";
const THEME_KEY = "heltch.theme";

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

/** 오늘 = 하체, 본운동은 지정 종목 하나만. 워밍업/마무리는 비워 가이드를 짧게 만든다. */
async function seedTodayWithSingleMain(email: string) {
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["lower"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
            start_date=${today}, day_index_migrated=true,
            rest_date=null, override_date=null, override_block=null
      where user_id=${uid}`,
    [email],
  );
  await dbQuery(`delete from public.routine_exercises where user_id=${uid}`, [email]);
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, $2, $3, 4, 8, 60)`,
    [email, EXERCISE, EQUIPMENT],
  );
}

/** 테마를 저장하고 루틴 화면으로 다시 들어가 운동모드를 연 뒤, 본운동 영상을 돌려준다. */
async function enterWorkoutWithTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [THEME_KEY, theme],
  );
  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  // 저장한 테마가 첫 페인트에 실제로 반영됐는지 먼저 확인한다.
  expect(
    await page.evaluate(() => document.documentElement.classList.contains("dark")),
  ).toBe(theme === "dark");

  // 한 번 들어갔다 나오면 CTA 가 "다시 운동하기" 로 바뀐다 — 두 번째 진입도 받아야 한다.
  await page
    .getByRole("button", { name: /^(운동 시작|다시 운동하기)$/ })
    .first()
    .click();
  await page.waitForTimeout(1200);

  // 가이드는 워밍업부터 시작할 수 있다 — 본운동 영상이 나올 때까지 넘긴다.
  const video = page.locator(`video[src*="/exercise-guides/ai-v3/${EXERCISE}"]`);
  for (let i = 0; i < 10 && !(await video.count()); i++) {
    const next = page.getByRole("button", { name: "넘기기" });
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(500);
  }
  await expect(video.first()).toBeVisible({ timeout: 10_000 });
  return video.first();
}

/** 경로만 맞고 404/디코드 실패인 경우를 거른다 — 480 정사각 8초가 v3 규격. */
async function expectPlayable(video: ReturnType<Page["locator"]>) {
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(1);
  expect(
    await video.evaluate((v: HTMLVideoElement) => ({
      error: v.error?.code ?? null,
      width: v.videoWidth,
      height: v.videoHeight,
      duration: Math.round(v.duration),
    })),
  ).toEqual({ error: null, width: 480, height: 480, duration: 8 });
}

test("운동모드 누끼 영상은 테마별로 라이트/다크 두 벌이 붙는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  // 전제: 이 종목이 누끼(다크 있음) 종목이어야 한다. cutout:false 로 바뀌면 여기서 알려준다.
  expect(motionDarkIds).toContain(EXERCISE);

  const email = await signUpAndOnboard(page);
  await seedTodayWithSingleMain(email);

  // 라이트 — 회색 배경용 한 벌.
  const light = await enterWorkoutWithTheme(page, "light");
  await expect(light).toHaveAttribute(
    "src",
    `/exercise-guides/ai-v3/${EXERCISE}.mp4`,
  );
  await expectPlayable(light);
  // 누끼 영상은 화면 배경에 녹여야 하므로 검은 박스를 두르지 않는다.
  expect(
    await light.evaluate((v: HTMLVideoElement) =>
      getComputedStyle(v.parentElement!).backgroundColor,
    ),
  ).not.toBe("rgb(0, 0, 0)");

  // 다크 — 같은 종목의 다크 한 벌로 바뀐다.
  const dark = await enterWorkoutWithTheme(page, "dark");
  await expect(dark).toHaveAttribute(
    "src",
    `/exercise-guides/ai-v3/${EXERCISE}-dark.mp4`,
  );
  await expectPlayable(dark);
});
