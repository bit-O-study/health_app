import { expect, test } from "@playwright/test";

import { createOnboardedAccount } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

/**
 * 운동모드 한 줄 코치(2026-09-29) — 영상·사진 동작에 맞춘 한 줄 자막, 휴식 카드의 다음·조심.
 *
 * ⚠ Playwright 의 Chromium 은 H.264(mp4)를 재생하지 못해 영상 재생 시각이 흐르지 않는다.
 *   영상 구간 계산은 단위테스트(motion-caption.test)가 지키고, 여기서는 영상 자막이 '동작 맞춤'
 *   으로 붙는지와, 사진 교차 재생에 맞춰 칸이 바뀌는지를 본다.
 */

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

async function seedDay(email: string, rows: string) {
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom',
            custom_week='[["chest"],["rest"],["rest"],["rest"],["rest"],["rest"],["rest"]]'::jsonb,
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
     values ${rows}`,
    [email],
  );
}

test("🔴 사진 운동: 시작/끝 자세 표시와 자막이 사진에 맞춰 바뀌고, 휴식 카드에 다음 세트·조심", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  // 펙덱 — 실사 사진 두 장(Butterfly), 영상 없음.
  await seedDay(email, `(${uid}, 0, 'chest', 0, 'pec-deck', 'machine', 3, 12, 20)`);

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();

  const caption = page.getByTestId("motion-caption");
  await expect(caption).toBeVisible({ timeout: 15_000 });
  await expect(caption).toHaveAttribute("data-synced", "1");
  await expect(page.getByTestId("pose-label-start")).toBeAttached();
  await expect(page.getByTestId("pose-label-end")).toBeAttached();
  // 사진이 바뀌면 칸도 바뀐다(준비 → 동작/돌아오기).
  await expect(caption).toHaveAttribute("data-slot", "0");
  await expect(caption).not.toHaveAttribute("data-slot", "0", { timeout: 4000 });
  await expect(caption).toContainText(/동작|돌아오기/);

  // 세트 완료 → 휴식 카드: 고정 문구 대신 다음 세트와 조심 한 줄.
  await page.getByRole("button", { name: "세트 완료", exact: true }).click();
  await expect(page.getByText("휴식 중")).toBeVisible();
  await expect(page.getByTestId("rest-next")).toContainText("세트 2/3 · 12회 · 20kg");
  await expect(page.getByTestId("rest-caution")).toContainText("조심 ·");
  await expect(page.getByText("충분히 쉬고 다음 세트로")).toHaveCount(0);
});

test("AI 영상 운동: 자막이 영상 동작 맞춤으로 붙는다 · 다음 운동 미리보기", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await createOnboardedAccount(page);
  // 바벨 백스쿼트(ai-v3 영상, 2세트) → 펙덱.
  await seedDay(
    email,
    `(${uid}, 0, 'chest', 0, 'barbell-back-squat', 'barbell', 2, 5, 60),
     (${uid}, 0, 'chest', 1, 'pec-deck', 'machine', 3, 12, 20)`,
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();

  const video = page.locator("video").first();
  await expect(video).toHaveAttribute("src", /\/exercise-guides\/ai-v3\/barbell-back-squat(-dark)?\.mp4/, { timeout: 15_000 });
  const caption = page.getByTestId("motion-caption");
  await expect(caption).toHaveAttribute("data-synced", "1");
  await expect(caption).toContainText("준비");
  // 틀 문장 조사가 다듬어져 있다.
  await expect(caption).not.toContainText("을(를)");

  // 1세트 → 휴식(다음 세트) → 마지막 세트 → 다음 운동으로 넘어가며 휴식 카드가 다음 운동을 알려 준다.
  await page.getByRole("button", { name: "세트 완료", exact: true }).click();
  await expect(page.getByTestId("rest-next")).toContainText("세트 2/2 · 5회 · 60kg");
  await page.getByRole("button", { name: "휴식 끝내기" }).click();
  await page.getByRole("button", { name: "마지막 세트 완료" }).click();
  await expect(page.getByTestId("rest-next")).toContainText("다음 운동 · 펙덱", { timeout: 10_000 });
});
