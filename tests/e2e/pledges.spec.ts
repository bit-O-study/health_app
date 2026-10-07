import { expect, test, type Page } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

// 다짐 개편(2026-10-06) — 설문 없음. 몸 정보(인바디 또는 직접 입력) → 행동 다짐 + 예상 결과,
// 필수 묶음(소모↔식단, 근력↔단백질), 7일 구간 실패 판정, 다짐 현황(식단 미기록 날짜),
// 그룹 공유(생성·편집에서 선택), 끼니 '안 먹었어요'.

const uid = `(select id from auth.users where lower(email)=lower($1))`;

async function fillBody(page: Page) {
  await page.goto("/commitments/new", { waitUntil: "networkidle" });
  await expect(page.getByTestId("body-setup")).toBeVisible({ timeout: 15_000 });
  // 체중 등 몸 정보를 넣기 전엔 다짐 만들기 화면 자체가 안 나온다(65kg 가정으로 만들지 않음).
  await expect(page.getByTestId("pledge-form")).toHaveCount(0);
  await page.getByLabel("키").fill("175");
  await page.getByLabel("체중").fill("70");
  await page.getByLabel("체지방률").fill("20");
  await page.getByLabel("골격근량").fill("31.5");
  await page.getByTestId("body-save").click();
  await expect(page.getByTestId("pledge-form")).toBeVisible({ timeout: 15_000 });
}

async function createDefaultPledge(page: Page, title: string) {
  await fillBody(page);
  await page.getByLabel("다짐 이름").fill(title);
  await page.getByRole("button", { name: "다짐 만들기" }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/commitments", { timeout: 20_000 });
  await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
}

test("인바디가 없으면 직접 입력해야 만들 수 있고, 예상은 필요한 다짐이 있을 때만 보인다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await fillBody(page);

  // 직접 입력은 오늘 날짜 체성분 기록으로 저장된다.
  const bc = await dbQuery<{ skeletal_muscle_kg: string; body_fat_pct: string }>(
    `select skeletal_muscle_kg::text, body_fat_pct::text from public.body_compositions where user_id=${uid}`,
    [email],
  );
  expect(bc).toHaveLength(1);
  expect(Number(bc[0].skeletal_muscle_kg)).toBe(31.5);

  // 기본값(예시): 30일 · 주 4일 500kcal · 3끼 · 섭취 상한 → 체중 예상이 보인다. 근육 예상은 없다.
  await expect(page.getByTestId("pred-weight")).toBeVisible();
  await expect(page.getByTestId("pred-muscle")).toHaveCount(0);

  // 식단을 끄면 — 소모 다짐은 식단 다짐 없이 못 만든다 + 체중 예상이 사라진다.
  await page.getByRole("button", { name: "식단 다짐 끄기" }).click();
  await expect(page.getByTestId("pledge-errors")).toContainText("식단 칼로리");
  await expect(page.getByTestId("pred-weight")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "다짐 만들기" })).toBeDisabled();
  await page.getByRole("button", { name: "식단 다짐 켜기" }).click();
  await page.getByTestId("intake-max").fill("1680");

  // 근력을 켜면 단백질이 같이 들어가고(권장값) 근육 예상 + 부위(인바디) 예상이 보인다.
  await page.getByRole("button", { name: "근력운동 다짐 켜기" }).click();
  await expect(page.getByTestId("protein")).toHaveValue("110");
  await expect(page.getByTestId("pred-muscle")).toBeVisible();
  await expect(page.getByTestId("pred-muscle")).toContainText("31.5kg");
  // 단백질을 지우면 근력 다짐을 저장할 수 없다.
  await page.getByTestId("protein").fill("");
  await expect(page.getByTestId("pledge-errors")).toContainText("단백질");
  await page.getByTestId("protein").fill("112");

  // 무료 — 목표로 만들기는 잠겨 있다(990원 라이트부터).
  await page.getByTestId("goal-mode").click();
  await expect(page.getByTestId("goal-locked")).toBeVisible();
  await page.getByRole("button", { name: "행동으로 만들기" }).click();

  await page.getByLabel("다짐 이름").fill("E2E 감량 다짐");
  await page.getByRole("button", { name: "다짐 만들기" }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/commitments", { timeout: 20_000 });
  await expect(page.getByTestId("pledge-card").first()).toContainText("E2E 감량 다짐");
  await expect(page.getByTestId("pledge-status").first()).toHaveText("진행 중");

  const out = await dbQuery<{ mode: string; status: string; w: string | null; m: string | null; fv: string; dir: string }>(
    `select c.mode, o.status, o.predicted_weight_change_kg::text as w, o.predicted_muscle_change_kg::text as m,
            o.formula_version as fv, o.direction as dir
       from public.commitments c join public.commitment_outcomes o on o.commitment_id = c.id
      where c.user_id=${uid}`,
    [email],
  );
  expect(out).toHaveLength(1);
  expect(out[0]).toMatchObject({ mode: "pledge", status: "active", fv: "rule-v3", dir: "forward" });
  expect(Number(out[0].w)).toBeLessThan(0);
  expect(Number(out[0].m)).toBeGreaterThan(0);
});

test("7일 구간 — 식단 미기록 날짜를 현황에 보여 주고, 구간이 끝나면 다짐 실패로 확정", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await createDefaultPledge(page, "E2E 실패 다짐");

  // 3일 전에 시작한 것으로 — 지난 3일 식단이 비어 있다.
  await dbQuery(
    `update public.commitments set start_date = (now() at time zone 'Asia/Seoul')::date - 3,
            deadline = (now() at time zone 'Asia/Seoul')::date + 26
      where user_id=${uid} and mode='pledge'`,
    [email],
  );
  await page.goto("/commitments/status", { waitUntil: "networkidle" });
  await expect(page.getByTestId("missing-diet")).toContainText("기록이 안 됐어요");
  await expect(page.getByTestId("status-card")).toContainText("1/5주차");
  // 홈 '오늘의 다짐'에도 같은 경고가 보인다.
  await page.goto("/home", { waitUntil: "networkidle" });
  await expect(page.getByText("E2E 실패 다짐")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("식단 3일 미기록")).toBeVisible();

  // 10일 전 시작 — 첫 구간(7일)이 끝났고 식단이 비어 있으므로 실패.
  await dbQuery(
    `update public.commitments set start_date = (now() at time zone 'Asia/Seoul')::date - 10,
            deadline = (now() at time zone 'Asia/Seoul')::date + 19
      where user_id=${uid} and mode='pledge'`,
    [email],
  );
  await page.goto("/commitments", { waitUntil: "networkidle" });
  await expect(page.getByTestId("pledge-status").first()).toHaveText("다짐 실패");
  await expect(page.getByTestId("fail-reason")).toContainText("1주차에 실패");
  await expect(page.getByTestId("fail-reason")).toContainText("식단 기록 누락");

  await expect
    .poll(async () => {
      const r = await dbQuery<{ status: string; reason: string[] | null; fin: boolean }>(
        `select status, failed_reason as reason, finalized_at is not null as fin
           from public.commitment_outcomes where user_id=${uid}`,
        [email],
      );
      return r[0] ? `${r[0].status}:${r[0].fin}:${(r[0].reason ?? []).join(",")}` : "";
    }, { timeout: 15_000 })
    .toContain("failed:true:");
});

test("그룹 공유 — 편집에서 공유를 켜면 그룹별 다짐에 보이고, 시작한 다짐은 항목이 잠긴다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await dbQuery(
    `with g as (insert into public.groups (name, owner_id) values ('E2E 다짐 그룹', ${uid}) returning id)
     insert into public.group_members (group_id, user_id, role, display_name)
     select g.id, ${uid}, 'owner', '나' from g`,
    [email],
  );
  await createDefaultPledge(page, "E2E 공유 다짐");

  await page.getByRole("link", { name: "다짐 편집" }).first().click();
  await page.waitForURL(/\/commitments\/[0-9a-f-]{36}\/edit/, { timeout: 15_000 });
  // 오늘 시작했으므로 항목은 잠기고 이름·공유만 바꿀 수 있다.
  await expect(page.getByText("시작한 다짐은 항목을 바꿀 수 없어요", { exact: false })).toBeVisible();
  await page.getByTestId("share-groups").getByRole("checkbox").check();
  await page.getByLabel("다짐 이름").fill("E2E 공유 다짐(수정)");
  await page.getByRole("button", { name: "저장" }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/commitments", { timeout: 20_000 });
  await expect(page.getByText("E2E 다짐 그룹에 공유 중")).toBeVisible();

  await page.goto("/commitments/groups", { waitUntil: "networkidle" });
  const card = page.getByTestId("group-pledge").first();
  await expect(card).toContainText("E2E 공유 다짐(수정)");
  await expect(card).toContainText("진행 중");
  // 체중·체성분은 공유되지 않는다.
  await expect(card).not.toContainText("kg");
});

test("식단 — 끼니 '안 먹었어요' 체크가 저장된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await page.goto("/diet", { waitUntil: "networkidle" });
  await page.getByTestId("meal-skip-breakfast").click();
  await expect(page.getByTestId("meal-skip-breakfast")).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => (await dbQuery(`select 1 from public.meal_skips where user_id=${uid} and meal='breakfast'`, [email])).length, {
      timeout: 15_000,
    })
    .toBe(1);
});

test("성공 확정 — 종료 체중은 마지막 7일 평균, 결과 신뢰도(data_quality)가 같이 저장된다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  const email = await signUpAndOnboard(page);
  await createDefaultPledge(page, "E2E 성공 다짐");

  // 31일 전에 시작한 '하루 3끼 기록' 다짐으로 바꾸고, 매일 3끼를 그날 올린 것처럼 넣는다
  // (구간 판정 뒤에 올린 기록은 세지 않으므로 created_at 을 그 날짜로).
  await dbQuery(
    `update public.commitments set start_date = (now() at time zone 'Asia/Seoul')::date - 31,
            deadline = (now() at time zone 'Asia/Seoul')::date - 2, pledge = '{"days":30,"mealsPerDay":3}'::jsonb
      where user_id=${uid} and mode='pledge'`,
    [email],
  );
  await dbQuery(
    `insert into public.food_logs (user_id, for_date, meal, name, kcal, protein_g, created_at)
     select ${uid}, d::date, m, '테스트 식사', 600, 30, d + interval '12 hours'
       from generate_series((now() at time zone 'Asia/Seoul')::date - 31, (now() at time zone 'Asia/Seoul')::date - 2, interval '1 day') d,
            unnest(array['breakfast','lunch','dinner']) m`,
    [email],
  );
  // 마지막 7일 체중 3번(평균 69.0) + 범위 밖 1번(무시).
  await dbQuery(
    `insert into public.weight_logs (user_id, weight_kg, created_at)
     select ${uid}, w, ((now() at time zone 'Asia/Seoul')::date - dd)::timestamp at time zone 'Asia/Seoul' + interval '8 hours'
       from (values (69.4, 3), (68.8, 5), (68.8, 7), (75.0, 15)) v(w, dd)`,
    [email],
  );

  await page.goto("/commitments", { waitUntil: "networkidle" });
  await expect(page.getByTestId("pledge-status").first()).toHaveText("다짐 성공");

  await expect
    .poll(async () => {
      const r = await dbQuery<{ status: string; m: { weightKg: number; weightMethod: string; weightPoints: number } | null; q: { score: number; mealCompleteness: number; usableForMuscle: boolean } | null }>(
        `select status, end_measure as m, data_quality as q from public.commitment_outcomes where user_id=${uid}`,
        [email],
      );
      const o = r[0];
      return o?.m && o.q
        ? `${o.status}|${o.m.weightMethod}|${o.m.weightPoints}|${o.m.weightKg}|${o.q.mealCompleteness}|${o.q.usableForMuscle}`
        : "";
    }, { timeout: 15_000 })
    .toBe("success|avg7|3|69|1|false");
});

// 주별·월별 변화(2026-10-07) — 주별 칸 = 판정 구간, 지난주와 같은 일수끼리 비교, 60일 다짐은 월별도.
test("현황 — 주별 표·지난주 대비 한 줄·몸 그래프, 30일 넘는 다짐은 월별로 바꿔 본다", async ({ page }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  const email = await signUpAndOnboard(page);
  await createDefaultPledge(page, "E2E 변화 다짐");

  // 60일 · 주 1일 운동, 10일 전 시작 → 1구간(-10~-4) 끝남, 2구간(-3~+3) 4일째.
  await dbQuery(
    `update public.commitments set pledge='{"days":60,"workoutDays":1}'::jsonb,
            start_date=(now() at time zone 'Asia/Seoul')::date - 10,
            deadline=(now() at time zone 'Asia/Seoul')::date + 49
      where user_id=${uid} and mode='pledge'`,
    [email],
  );
  // 1구간 둘째 날 운동(그날 올린 기록) — 이번 구간은 아직 0일. 체중 두 번.
  await dbQuery(
    `insert into public.exercise_completions (user_id, for_date, exercise_row_id, status, exercise_id, equipment, sets, reps, focus, created_at)
     values (${uid}, (now() at time zone 'Asia/Seoul')::date - 9, gen_random_uuid(), 'done', 'squat', 'barbell', 3, 10, 'lower',
             ((now() at time zone 'Asia/Seoul')::date - 9)::timestamp at time zone 'Asia/Seoul' + interval '12 hours')`,
    [email],
  );
  await dbQuery(
    `insert into public.weight_logs (user_id, weight_kg, created_at) values
       (${uid}, 70.2, ((now() at time zone 'Asia/Seoul')::date - 9)::timestamp at time zone 'Asia/Seoul' + interval '8 hours'),
       (${uid}, 69.6, ((now() at time zone 'Asia/Seoul')::date - 1)::timestamp at time zone 'Asia/Seoul' + interval '8 hours')`,
    [email],
  );

  await page.goto("/commitments/status", { waitUntil: "networkidle" });
  const trend = page.getByTestId("pledge-trend");
  await expect(trend).toBeVisible({ timeout: 15_000 });
  // 같은 4일끼리: 지난 구간 1일 vs 이번 0일.
  await expect(trend.getByTestId("trend-compare")).toHaveText("지난주보다 운동 1일 적어요");
  const cells = trend.getByTestId("trend-table").locator("tbody tr").first().locator("td");
  await expect(cells.nth(0)).toHaveAttribute("data-state", "ok");
  await expect(cells.nth(1)).toHaveAttribute("data-state", "now");
  await expect(cells.nth(2)).toHaveAttribute("data-state", "future");
  await expect(trend.getByTestId("trend-body")).toBeVisible();

  // 60일 다짐 — 월별로 바꾸면 칸이 달력 월.
  await trend.getByRole("tab", { name: "월별" }).click();
  await expect(trend).toHaveAttribute("data-mode", "month");
  await expect(trend.getByTestId("trend-table").locator("thead th").nth(1)).toHaveText(/^\d+월$/);
});
