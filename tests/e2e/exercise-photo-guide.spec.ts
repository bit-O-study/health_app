import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 운동하기(가이드)에서 본운동 차례가 되면, 등록 영상이 없어도 free-exercise-db 실사 사진
// (시작/끝 2프레임)이 표시돼야 한다 — 스쿼트 = Barbell_Squat. (SVG 폴백이 아니라 실사)

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

test("가이드 본운동에 실사 시연 사진(스쿼트)이 뜬다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 오늘 = 하체, 본운동은 스쿼트 1개만(가이드에서 워밍업 뒤 바로 스쿼트).
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

  // 가이드는 워밍업부터 — 본운동(스쿼트)에 닿을 때까지 '넘기기'.
  const squatImg = page.locator('img[src*="Barbell_Squat"]');
  for (let i = 0; i < 8; i++) {
    if (await squatImg.count()) break;
    const next = page.getByRole("button", { name: "넘기기" });
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(500);
  }

  // 스쿼트 차례 — 실사 사진(0/1 프레임)이 보인다(SVG 폴백 아님).
  await expect(squatImg.first()).toBeVisible({ timeout: 8000 });
  const srcs = await squatImg.evaluateAll((els) =>
    (els as HTMLImageElement[]).map((e) => e.src),
  );
  expect(srcs.some((s) => s.includes("/Barbell_Squat/0.jpg"))).toBe(true);
  expect(srcs.some((s) => s.includes("/Barbell_Squat/1.jpg"))).toBe(true);

  // 자막 단계가 가리키는 신체 부위가 사진 위 배지로 안내된다(확대 X — 선명 유지).
  // (단계가 3초마다 순환하므로 한 바퀴 안에 배지가 보이는지 확인.)
  const marker = page.getByTestId("ex-focus-marker");
  await expect(marker).toBeVisible({ timeout: 8000 });
  // 사진은 확대(scale) 없이 원본 그대로여야 한다(저해상도 줌으로 깨지지 않게).
  const notScaled = await squatImg.first().evaluate((el) => {
    const t = getComputedStyle(el as HTMLElement).transform;
    if (!t || t === "none") return true;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (!m) return true;
    const a = parseFloat(m[1].split(",")[0]);
    return Math.abs(a - 1) < 0.01; // 배율 ≈ 1
  });
  expect(notScaled).toBe(true);

  // 장황한 5단 설명 대신 간결 가이드(자극 부위 + 한 줄 요약 + 핵심 포인트)가 뜬다.
  await expect(page.getByText("핵심 포인트")).toBeVisible();
  // 한 줄 요약·핵심에 타겟 부위(둔근/대퇴)가 담겨 보인다.
  await expect(page.getByText(/둔근|대퇴/).first()).toBeVisible();
});

test("기구별로 다른 시연 사진 — 덤벨 인클라인 프레스는 덤벨 사진이 뜬다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 오늘 = 가슴, 본운동은 인클라인 프레스 1개(덤벨). (bench-press 는 관리자 영상이 있어
  // 사진이 아니라 영상이 뜨므로, 영상 없는 incline-press 로 기구별 사진 라우팅을 가드.)
  // 바벨 인클라인이 아니라 덤벨 인클라인 시연이 떠야 한다.
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
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'chest', 0, 'incline-press', 'dumbbell', 4, 10, 20)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);

  // 인클라인 프레스(덤벨)에 닿을 때까지 넘기기.
  const dbIncline = page.locator('img[src*="Hammer_Grip_Incline_DB_Bench_Press"]');
  for (let i = 0; i < 8; i++) {
    if (await dbIncline.count()) break;
    const next = page.getByRole("button", { name: "넘기기" });
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(500);
  }

  // 덤벨 전용 사진이 뜨고, 바벨 인클라인 사진은 뜨지 않는다.
  await expect(dbIncline.first()).toBeVisible({ timeout: 8000 });
  await expect(page.locator('img[src*="Barbell_Incline"]')).toHaveCount(0);
});

test("워밍업도 실사 시연 사진 + 부위 마커가 뜬다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 오늘 = 하체. 워밍업으로 보디웨이트 스쿼트(bw-squat) 1개 + 본운동 스쿼트.
  // 가이드는 워밍업부터 → 첫 화면에 bw-squat 실사 사진(Bodyweight_Squat)이 떠야 한다.
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
  await dbQuery(
    `insert into public.routine_exercises
       (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg)
     values (${uid}, 0, 'lower', 0, 'squat', 'barbell', 4, 8, 60)`,
    [email],
  );
  // 워밍업 컨디셔닝(focus=primaryTone='lower', kind='warmup').
  await dbQuery(`delete from public.routine_conditioning where user_id=${uid}`, [email]);
  await dbQuery(
    `insert into public.routine_conditioning
       (user_id, focus, kind, position, item_id, duration_min, speed, incline)
     values (${uid}, 'lower', 'warmup', 0, 'bw-squat', null, null, null)`,
    [email],
  );

  await page.goto("/routine", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "운동 시작" }).click();
  await page.waitForTimeout(1200);

  // 첫 화면이 워밍업(보디웨이트 스쿼트) — 실사 사진 + 부위 줌 마커.
  await expect(page.locator('img[src*="Bodyweight_Squat"]').first()).toBeVisible({
    timeout: 8000,
  });
  await expect(page.getByTestId("ex-focus-marker")).toBeVisible({ timeout: 8000 });
});
