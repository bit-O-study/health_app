import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";
import { scopedName } from "./helpers/run-scope";

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

  // 🔴 하부 대흉근은 '안 함'도 '했음'도 아니다 — 벤치프레스가 거들었을 뿐,
  //    하부를 노린 운동은 한 적이 없다. 그 중간을 따로 말해 준다.
  await expect(list.locator('[data-sub="chest-lower"]')).toHaveCount(0);
  const synergist = page.getByTestId("synergist-only-subs");
  await expect(synergist.locator('[data-sub="chest-lower"]')).toHaveCount(1);
  await expect(synergist.locator('[data-sub="chest-mid"]')).toHaveCount(0);
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
  // 🔴 미래 날짜로 심지 않는다(2026-09-21). `dayOfWeek: 2` 는 이번 주 수요일이라,
  // **오늘이 월·화면 미래**가 된다. 트레이너 쪽 조회에는 `.lte("for_date", today)` 가
  // 있어(`getGroupMemberWeeklyTraining`) 미래 기록이 빠지는데, 회원 본인 화면엔 그 필터가
  // 없어 3세트가 보인다 → 같은 주 월·화에만 이 테스트가 깨졌다.
  // 애초에 "미래에 완료한 운동"은 있을 수 없는 상태라, 월요일(0)로 심어 날짜에 안 흔들리게 한다.
  await seedCompletion(memberEmail, {
    dayOfWeek: 0,
    exerciseId: "lat-pulldown",
    focus: "back",
    sets: 3,
  });

  // ── 트레이너: 가입 후 그룹 생성
  const ctxT = await browser.newContext();
  const pageT = await ctxT.newPage();
  await signUpAndOnboard(pageT);
  await pageT.goto("/groups", { waitUntil: "networkidle" });
  // 이름으로 되찾을 것이라 실행별로 유일해야 한다 — 동시 실행과 안 섞이게.
  const groupName = scopedName("E2E 주간분석");
  await pageT.getByLabel("그룹 이름").fill(groupName);
  await pageT.getByRole("button", { name: "그룹 만들기" }).click();
  await pageT.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 10000 });

  const g = await dbQuery<{ id: string; invite_token: string }>(
    `select id, invite_token from public.groups where name=$1`,
    [groupName],
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

test("🔴 세트를 채워도 하루에 몰아쳤으면 짚어 준다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  // 가슴 16세트를 **하루에** — 세트로만 보면 '적정'이라 아무 말도 안 나왔다.
  await seedCompletion(email, { dayOfWeek: 0, exerciseId: "bench-press", focus: "chest", sets: 16 });
  // 등 12세트를 **이틀에 나눠** — 같은 '적정'이지만 여긴 경고가 없어야 한다.
  await seedCompletion(email, { dayOfWeek: 1, exerciseId: "lat-pulldown", focus: "back", sets: 6 });
  await seedCompletion(email, { dayOfWeek: 3, exerciseId: "lat-pulldown", focus: "back", sets: 6 });

  await page.goto("/settings/score", { waitUntil: "networkidle" });
  const card = page.getByTestId("weekly-training-card");
  await expect(card).toBeVisible({ timeout: 10000 });

  await expect(card.getByTestId("region-volume-chest")).toHaveAttribute("data-status", "optimal");
  await expect(card.getByTestId("region-crammed-chest")).toBeVisible();
  await expect(card.getByTestId("region-volume-chest")).toContainText("주 1회");

  await expect(card.getByTestId("region-volume-back")).toHaveAttribute("data-status", "optimal");
  await expect(card.getByTestId("region-crammed-back")).toHaveCount(0);
  await expect(card.getByTestId("region-volume-back")).toContainText("주 2회");
});

test("지난주 대비 증감이 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  // 지난주 가슴 4세트 → 이번 주 10세트.
  await seedCompletion(email, { dayOfWeek: -7, exerciseId: "bench-press", focus: "chest", sets: 4 });
  await seedCompletion(email, { dayOfWeek: 0, exerciseId: "bench-press", focus: "chest", sets: 10 });

  await page.goto("/settings/score", { waitUntil: "networkidle" });
  const card = page.getByTestId("weekly-training-card");
  await expect(card).toBeVisible({ timeout: 10000 });
  await expect(card.getByTestId("region-volume-chest")).toHaveAttribute("data-sets", "10");
  await expect(card.getByTestId("region-delta-chest")).toHaveAttribute("data-diff", "6");
});

test("🔴 트레이너 목록이 '늘 같은 데만 하는 회원'을 짚어 준다", async ({ browser }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(180_000);

  // ── 회원: 이번 주 5일 나왔지만 **전부 가슴만** 했다.
  const ctxM = await browser.newContext();
  const pageM = await ctxM.newPage();
  const memberEmail = await signUpAndOnboard(pageM);
  for (const day of [0, 1, 2, 3, 4]) {
    await seedCompletion(memberEmail, {
      dayOfWeek: day,
      exerciseId: "bench-press",
      focus: "chest",
      sets: 4,
    });
  }

  // ── 트레이너: 그룹 생성
  const ctxT = await browser.newContext();
  const pageT = await ctxT.newPage();
  await signUpAndOnboard(pageT);
  const name = `E2E 편식 ${Date.now().toString(36)}`;
  await pageT.goto("/groups", { waitUntil: "networkidle" });
  await pageT.getByLabel("그룹 이름").fill(name);
  await pageT.getByRole("button", { name: "그룹 만들기" }).click();
  await pageT.waitForURL(/\/groups\?g=[0-9a-f-]{8,}/, { timeout: 15000 });

  const g = await dbQuery<{ id: string; invite_token: string }>(
    `select id, invite_token from public.groups where name=$1`,
    [name],
  );
  expect(g.length).toBe(1);

  await pageM.goto(`/groups/join/${g[0].invite_token}`);
  await pageM.getByRole("button", { name: "확인" }).click();
  await expect
    .poll(
      async () =>
        (
          await dbQuery<{ n: string }>(
            `select count(*)::text n from public.group_members where group_id=$1`,
            [g[0].id],
          )
        )[0].n,
      { timeout: 20000 },
    )
    .toBe("2");

  // ── 목록에서 바로 보인다 — 회원 상세로 들어가지 않고도.
  await pageT.goto(`/groups/${g[0].id}/trainer`, { waitUntil: "domcontentloaded" });
  const row = pageT.getByTestId("trainer-member").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  // 주 5일 나왔으니 '결석' 은 아니다 — 예전엔 이런 회원이 우등생으로 보였다.
  await expect(row.locator('[data-kind="absence"]')).toHaveCount(0);
  const program = row.locator('[data-kind="program"]');
  await expect(program).toHaveCount(1);
  await expect(program).toContainText("0세트");
  // 가슴만 했으니 나머지 다섯 부위가 전부 이름으로 나와야 한다 — 잘려서 묻히면 안 된다.
  for (const label of ["등", "어깨", "팔", "하체", "코어"]) {
    await expect(program).toContainText(label);
  }
  await expect(program).not.toContainText("가슴");

  // 그 자리에서 바로 배정으로 갈 수 있다.
  await expect(row.getByTestId("assign-link")).toBeVisible();

  await ctxM.close();
  await ctxT.close();
});

// 2026-09-20 런처 전환 — 이번 주 요약은 홈에서 **운동 앱의 '기록' 칸**(/settings/progress)으로
// 내려왔다. 홈엔 위젯 한 줄만 남는다. "한 장만 둔다"는 약속(2026-09-15)은 그대로다.
test("기록 칸에서 이번 주 요약이 보이고 점수 화면으로 이어진다 — 홈·운동탭엔 같은 카드를 두지 않는다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await seedCompletion(email, { dayOfWeek: 0, exerciseId: "bench-press", focus: "chest", sets: 8 });

  // 기록 칸 — 전체 분석은 점수 화면에 두고, 여기서는 "어디가 비었나"만.
  await page.goto("/settings/progress", { waitUntil: "networkidle" });
  const summary = page.getByTestId("weekly-training-summary");
  await expect(summary).toBeVisible({ timeout: 10000 });
  await expect(summary).toHaveAttribute("data-week-sets", "8");
  await expect(summary.getByTestId("summary-region-chest")).toHaveAttribute("data-status", "low");
  await expect(summary.getByTestId("summary-region-leg")).toHaveAttribute("data-status", "none");
  await expect(summary).toContainText("0세트");

  // 홈·운동탭엔 같은 카드를 두지 않는다 — 홈은 요약 위젯 한 줄만.
  await page.goto("/home", { waitUntil: "networkidle" });
  await expect(page.getByRole("navigation", { name: "앱" })).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("weekly-training-summary")).toHaveCount(0);
  await page.goto("/routine", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "오늘의 운동" })).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("weekly-training-summary")).toHaveCount(0);

  // 요약 카드를 눌러서 전체 분석으로.
  await page.goto("/settings/progress", { waitUntil: "networkidle" });
  await page.getByTestId("weekly-training-summary").click();
  await page.waitForURL("**/settings/score", { timeout: 15000 });
  await expect(page.getByTestId("weekly-training-card")).toBeVisible({ timeout: 10000 });
});

test("🔴 이번 주 운동이 없으면 요약을 아예 안 그린다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await signUpAndOnboard(page);

  // "전부 0세트"는 분석이 아니라 잔소리다 — 오늘 할 운동을 권하는 건 다른 카드의 몫.
  await page.goto("/home", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await expect(page.getByTestId("weekly-training-summary")).toHaveCount(0);
});

test("정체 중인 종목이 주간 분석에 같이 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await dbQuery(`update public.profiles set experience='advanced' where user_id=${uid}`, [email]);

  // 같은 무게로 네 세션 — 최고치가 안 늘었다(정체).
  for (const back of [21, 14, 7, 0]) {
    await dbQuery(
      `insert into public.exercise_completions
         (user_id, for_date, exercise_row_id, status, exercise_id, equipment, focus, sets, reps, weight_kg)
       values (${uid}, ${today} - $2::int, gen_random_uuid(), 'done', 'squat', 'barbell', 'lower', 5, 6, 100)`,
      [email, back],
    );
  }

  await page.goto("/settings/score", { waitUntil: "networkidle" });
  const stalls = page.getByTestId("stalled-exercises");
  await expect(stalls).toBeVisible({ timeout: 10000 });
  const row = stalls.locator('[data-exercise="squat"]');
  await expect(row).toHaveCount(1);
  // 어느 부위 문제인지 같이 말해 준다 — 밸런스와 이어 보라는 뜻이다.
  await expect(row).toContainText("하체");
  await expect(row).toContainText("스쿼트");
});
