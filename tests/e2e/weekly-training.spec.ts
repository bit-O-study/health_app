import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 이번 주 훈련 — 주당 직접 세트 기준의 부위 판정 + 요일 히트맵 + 균형 + 안 한 세부근육.
// 여기서 확인하는 것:
//  ① 절대 기준이다 — 3세트만 해도 '부족'. (예전 상대 기준에선 최강 부위면 '균형'이었다)
//  ② 한 운동은 주동근 한 부위에만 센다 — 벤치프레스는 가슴 세트이지 삼두 세트가 아니다
//  ③ 히트맵은 쉰 날도 칸을 남긴다
//  ④ 밀기/당기기가 기울면 경고가 뜬다
//  ⑤ 🔴 트레이너가 회원 화면에서 **같은 숫자**를 본다

const uid = `(select id from auth.users where lower(email)=lower($1))`;
const today = `(now() at time zone 'Asia/Seoul')::date`;

/** 이번 주 월요일(서울) 기준 n일째에 완료 기록을 넣는다. */
async function seedCompletion(
  email: string,
  opts: { dayOfWeek: number; exerciseId: string; focus: string; sets: number },
) {
  await dbQuery(
    `insert into public.exercise_completions
       (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus, sets, reps, weight_kg)
     values (
       ${uid},
       date_trunc('week', ${today})::date + $2::int,
       gen_random_uuid(), 'done', $3, 'barbell', $4, $5::int, 10, 60
     )`,
    [email, opts.dayOfWeek, opts.exerciseId, opts.focus, opts.sets],
  );
}

test("주당 직접 세트가 절대 기준으로 판정된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);

  // 가슴 12세트(적정), 등 3세트(부족), 하체 0세트(안 함)
  await seedCompletion(email, { dayOfWeek: 0, exerciseId: "bench-press", focus: "chest", sets: 8 });
  await seedCompletion(email, { dayOfWeek: 2, exerciseId: "bench-press", focus: "chest", sets: 4 });
  await seedCompletion(email, { dayOfWeek: 2, exerciseId: "lat-pulldown", focus: "back", sets: 3 });

  await page.goto("/settings/score", { waitUntil: "networkidle" });

  const card = page.getByTestId("weekly-training-card");
  await expect(card).toBeVisible({ timeout: 10000 });

  await expect(card.getByTestId("region-volume-chest")).toHaveAttribute("data-sets", "12");
  await expect(card.getByTestId("region-volume-chest")).toHaveAttribute("data-status", "optimal");

  // 🔴 3세트는 '부족'이다 — 예전 상대 기준에서는 등이 최강 부위면 '균형'으로 나왔다.
  await expect(card.getByTestId("region-volume-back")).toHaveAttribute("data-sets", "3");
  await expect(card.getByTestId("region-volume-back")).toHaveAttribute("data-status", "low");

  await expect(card.getByTestId("region-volume-leg")).toHaveAttribute("data-sets", "0");
  await expect(card.getByTestId("region-volume-leg")).toHaveAttribute("data-status", "none");

  // 🔴 벤치프레스 12세트가 팔·어깨에 얹히지 않는다(직접 세트만).
  await expect(card.getByTestId("region-volume-arm")).toHaveAttribute("data-sets", "0");
  await expect(card.getByTestId("region-volume-shoulder")).toHaveAttribute("data-sets", "0");
  await expect(card).toHaveAttribute("data-week-sets", "15");
});

test("히트맵은 월~일 7칸이고 쉰 날도 칸을 남긴다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedCompletion(email, { dayOfWeek: 0, exerciseId: "bench-press", focus: "chest", sets: 5 });

  await page.goto("/settings/score", { waitUntil: "networkidle" });
  const heat = page.getByTestId("week-heatmap");
  await expect(heat).toBeVisible({ timeout: 10000 });
  await expect(heat.locator("li")).toHaveCount(7);

  await expect(page.getByTestId("heat-0")).toHaveAttribute("data-sets", "5");
  // 화요일은 쉬었지만 칸이 있어야 "어디를 안 했는지"가 읽힌다.
  await expect(page.getByTestId("heat-1")).toHaveAttribute("data-sets", "0");
});

test("밀기가 당기기보다 크게 많으면 경고가 뜬다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedCompletion(email, { dayOfWeek: 0, exerciseId: "bench-press", focus: "chest", sets: 20 });
  await seedCompletion(email, { dayOfWeek: 2, exerciseId: "lat-pulldown", focus: "back", sets: 4 });

  await page.goto("/settings/score", { waitUntil: "networkidle" });
  const card = page.getByTestId("weekly-training-card");
  await expect(card).toBeVisible({ timeout: 10000 });
  await expect(card.getByTestId("balance-밀기 ↔ 당기기")).toHaveAttribute(
    "data-skewed",
    "true",
  );
  await expect(card).toContainText("어깨 통증은");
});

test("이번 주 안 건드린 세부근육을 짚어 준다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedCompletion(email, { dayOfWeek: 0, exerciseId: "bench-press", focus: "chest", sets: 5 });

  await page.goto("/settings/score", { waitUntil: "networkidle" });
  const list = page.getByTestId("untouched-subs");
  await expect(list).toBeVisible({ timeout: 10000 });

  // 벤치프레스는 중부·하부 대흉근이라 상부 대흉근은 이번 주 0세트다.
  await expect(list.locator('[data-sub="chest-upper"]')).toHaveCount(1);
  await expect(list.locator('[data-sub="lower-quads"]')).toHaveCount(1);
  // 실제로 한 것은 목록에 없어야 한다.
  await expect(list.locator('[data-sub="chest-mid"]')).toHaveCount(0);
});

test("🔴 트레이너가 회원 화면에서 같은 숫자를 본다", async ({ browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  // ── 회원: 가입 + 이번 주 기록
  const ctxM = await browser.newContext();
  const pageM = await ctxM.newPage();
  const memberEmail = await signUpAndOnboard(pageM);
  await seedCompletion(memberEmail, {
    dayOfWeek: 0,
    exerciseId: "bench-press",
    focus: "chest",
    sets: 12,
  });
  await seedCompletion(memberEmail, {
    dayOfWeek: 2,
    exerciseId: "lat-pulldown",
    focus: "back",
    sets: 3,
  });

  // ── 트레이너: 가입 후 그룹 생성
  const ctxT = await browser.newContext();
  const pageT = await ctxT.newPage();
  await signUpAndOnboard(pageT);
  await pageT.goto("/groups", { waitUntil: "networkidle" });
  await pageT.getByLabel("그룹 이름").fill("E2E 주간분석");
  await pageT.getByRole("button", { name: "그룹 만들기" }).click();
  await pageT.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 10000 });

  const g = await dbQuery<{ id: string; invite_token: string }>(
    `select id, invite_token from public.groups where name='E2E 주간분석'`,
  );
  expect(g.length).toBe(1);

  // 회원이 초대 링크로 참여 — 확인 버튼을 눌러야 실제로 가입된다.
  await pageM.goto(`/groups/join/${g[0].invite_token}`);
  await pageM.getByRole("button", { name: "확인" }).click();
  await pageM.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 15000 });

  const memberId = (
    await dbQuery<{ id: string }>(
      `select id from auth.users where lower(email)=lower($1)`,
      [memberEmail],
    )
  )[0].id;

  // ── 트레이너가 회원 상세를 연다
  // networkidle 을 기다리지 않는다 — 처음 여는 라우트는 dev 서버가 그 자리에서
  // 컴파일해서 idle 이 늦게 온다. 카드가 뜨는 것으로 충분히 기다린다.
  await pageT.goto(`/groups/${g[0].id}/member/${memberId}`, {
    waitUntil: "domcontentloaded",
  });

  const card = pageT.getByTestId("weekly-training-card");
  await expect(card).toBeVisible({ timeout: 15000 });
  // 회원 화면과 같은 판정 — 가슴 12(적정), 등 3(부족).
  await expect(card.getByTestId("region-volume-chest")).toHaveAttribute("data-sets", "12");
  await expect(card.getByTestId("region-volume-chest")).toHaveAttribute("data-status", "optimal");
  await expect(card.getByTestId("region-volume-back")).toHaveAttribute("data-sets", "3");
  await expect(card.getByTestId("region-volume-back")).toHaveAttribute("data-status", "low");
  await expect(card).toHaveAttribute("data-week-sets", "15");

  // 남의 화면에서는 내 운동을 찾아보라는 링크를 걸지 않는다.
  await expect(card.getByRole("link", { name: /부위별로 운동 찾아보기/ })).toHaveCount(0);

  await ctxM.close();
  await ctxT.close();
});
