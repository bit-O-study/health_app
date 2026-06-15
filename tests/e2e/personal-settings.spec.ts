import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 개인설정(상세 가이드)을 끄면 운동 모드에서 실제로 숨겨져야 한다.
// (프로필 컬럼 → routine → today-exercises → 세션타이머 → 가이드 오버레이 게이트 전 경로 가드.)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("개인설정 페이지가 에러 없이 뜨고 토글이 동작한다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  await page.goto("/settings/personal", { waitUntil: "networkidle" });

  // RSC 경계 위반(아이콘 함수 prop)으로 터지던 페이지 — 정상 렌더 가드.
  await expect(page.getByRole("heading", { name: "개인설정" })).toBeVisible();
  await expect(page.getByText("상세 가이드", { exact: true })).toBeVisible();
  await expect(page.getByText("휴식 종료 소리")).toBeVisible();
  await expect(page.getByText("휴식 종료 진동")).toBeVisible();
  await expect(page.getByText("기본 휴식 시간")).toBeVisible();

  // 토글 동작 — 에러 없이 처리(상태 반영).
  const guideSwitch = page.getByRole("switch", { name: "상세 가이드" });
  await expect(guideSwitch).toHaveAttribute("aria-checked", "true");
  await guideSwitch.click();
  await expect(guideSwitch).toHaveAttribute("aria-checked", "false");
});

test("휴식 종료 알림음 종류를 고르면 저장된다(음성/비프/내 소리)", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);
  await page.goto("/settings/personal", { waitUntil: "networkidle" });

  // 알림음 피커가 뜨고, 종류 3종 + 미리듣기가 있다.
  await expect(page.getByText("휴식 종료 알림음")).toBeVisible();
  await expect(page.getByRole("button", { name: "미리듣기" })).toBeVisible();

  // 기본은 음성 → 비프로 바꾸면 localStorage 에 저장된다.
  await page.getByRole("button", { name: /비프/ }).click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("heltch.rest.sound.kind")))
    .toBe("beep");
});

test("개인설정으로 상세 가이드를 끄면 운동 모드에서 숨겨진다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 상세 가이드를 끈다(기본은 켜짐).
  await dbQuery(
    `update public.profiles set show_exercise_guide = false where user_id = ${uid}`,
    [email],
  );

  // 오늘 = 하체, 스쿼트 1개.
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
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);

  // 스쿼트 실사 사진은 떠야 한다(영상 끄기 설정은 안 했으므로).
  await expect(page.locator('img[src*="Barbell_Squat"]').first()).toBeVisible({
    timeout: 8000,
  });

  // 끈 상세 가이드는 보이지 않아야 한다.
  await expect(page.getByText("핵심 포인트")).toHaveCount(0);
  await expect(page.getByText("초보가 자주 놓치는 것")).toHaveCount(0);
});
