import { expect, test, type Page } from "@playwright/test";

import { createTestAccount } from "./helpers/account-fixture";
import { AI_OPEN } from "./helpers/ai-open";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * AI 트레이너 탭(2026-09-30 2단계) — 오늘의 운동(시간 맞춤) · 오늘 식단 · 다짐 추천.
 *
 * 🔴 사용자 결정 — AI 가 운동을 직접 바꾸지 않는다. 탭에서 오늘의 운동을 보고 [바꾸기]/[더하기]를
 *    눌러야 '오늘만 운동 변경'으로 넘어간다. 영구 루틴은 그대로(원칙 2).
 *
 * 실제 AI 호출은 E2E 에서 부르지 않는다(비용·결과가 매번 다름). 개발 빌드 전용 입구
 * (`__jimkkunAiTrainerSeed`)로 제안을 넣고 적용 흐름을 끝까지 확인한다. AI 답을 읽고
 * 검사하는 규칙은 tests/be/logic/ai-trainer.test.ts · diet-coach.test.ts 가 지킨다.
 */

const PLAN = {
  summary: "등이 부족해서 당기기 위주로 가요.",
  items: [
    { exerciseId: "lat-pulldown", name: "랫풀다운", part: "back", equipment: "machine", reason: "등 주 0세트" },
    { exerciseId: "squat", name: "스쿼트", part: "lower", equipment: "barbell", reason: "오늘 하체 날" },
  ],
  tip: "천천히 내려요",
};

/** 오늘 하체(스쿼트) 루틴 + 이 계정만 잠깐 디버그 계정(공개 전 기능). */
async function setup(page: Page, baseURL: string) {
  await silenceDevOverlay(page);
  const { email, supabase, user_id } = await createTestAccount(page.context(), baseURL, false);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const routine = await supabase.from("user_routines").insert({
    user_id, splits: 0, variant_id: "custom",
    custom_week: [["lower"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"]],
    start_date: today, day_index_migrated: true,
  });
  if (routine.error) throw routine.error;
  const ex = await supabase.from("routine_exercises").insert({
    user_id, day_index: 0, focus: "lower", position: 0, exercise_id: "squat",
    equipment: "barbell", sets: 4, reps: 8, weight_kg: 60,
  });
  if (ex.error) throw ex.error;
  await dbQuery(
    `insert into public.app_settings(key, value)
       values ('debug.accounts', jsonb_build_array($1::text))
     on conflict (key) do update
       set value = coalesce(public.app_settings.value, '[]'::jsonb) || jsonb_build_array($1::text)`,
    [email],
  );
  const cleanup = () =>
    dbQuery(
      `update public.app_settings
         set value = coalesce(
           (select jsonb_agg(e) from jsonb_array_elements_text(value) e where e <> $1),
           '[]'::jsonb)
       where key='debug.accounts'`,
      [email],
    );
  return { user_id, today, cleanup };
}

/** 동의하고 들어가 제안을 넣는다. */
async function openWithPlan(page: Page) {
  // 디버그 앱은 홈 앱 판에서 '편집'으로 꺼내야 보인다 — 여기선 화면으로 바로 간다.
  await page.goto("/ai-trainer", { waitUntil: "networkidle" });
  await expect(page.getByTestId("ai-trainer-state")).toContainText("이름·이메일·연락처는 보내지 않아요");

  // 🔴 동의 전엔 AI 를 부를 수 없다 — 동의 카드가 먼저, '짜 줘' 버튼·다짐 추천은 없다.
  await expect(page.getByTestId("ai-trainer-consent")).toContainText("국외 서버");
  await expect(page.getByTestId("ai-trainer-generate")).toHaveCount(0);
  await expect(page.getByTestId("commitment-suggestions")).toHaveCount(0);
  await page.getByRole("button", { name: "동의하고 시작하기" }).click();

  // 동의하면 시간 맞춤 + '짜 줘' + 다짐 추천이 열린다.
  await expect(page.getByTestId("ai-trainer-generate")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("ai-trainer-time").getByRole("button", { name: "30분" }).click();
  await expect(page.getByTestId("ai-trainer-time").getByRole("button", { name: "30분" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("commitment-suggestions")).toBeVisible({ timeout: 10_000 });

  // 오늘 식단 — 목표와 오늘 먹은 양은 AI 없이 늘 보인다.
  await expect(page.getByTestId("ai-diet")).toContainText("칼로리");
  await expect(page.getByTestId("ai-diet")).toContainText("단백질");
  await expect(page.getByTestId("ai-diet-review")).toBeVisible();

  await page.waitForFunction(
    () => typeof (window as unknown as { __jimkkunAiTrainerSeed?: unknown }).__jimkkunAiTrainerSeed === "function",
  );
  await page.evaluate((p) => {
    (window as unknown as { __jimkkunAiTrainerSeed: (p: unknown) => void }).__jimkkunAiTrainerSeed(p);
  }, PLAN);
  await expect(page.getByTestId("ai-trainer-plan")).toContainText("등이 부족해서");
  await expect(page.getByTestId("ai-trainer-item-lat-pulldown")).toHaveAttribute("aria-pressed", "true");
}

test("AI 트레이너: [더하기]는 오늘만 담고(이미 할 운동은 빼고), 루틴은 그대로", async ({ page, baseURL }) => {
  test.skip(!AI_OPEN, "AI 가 닫혀 있다(AI_OPEN=false, 2026-10-01)");
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  const { user_id, today, cleanup } = await setup(page, baseURL!);
  try {
    await openWithPlan(page);
    await expect(page.getByTestId("ai-trainer-apply")).toHaveText("오늘 운동에 2개 더하기");
    await page.getByTestId("ai-trainer-apply").click();
    await page.waitForURL("**/routine", { timeout: 15_000 });
    await expect(page.getByText("랫풀다운").first()).toBeVisible({ timeout: 10_000 });

    const daily = await dbQuery<{ exercise_id: string }>(
      `select exercise_id from public.daily_plan where user_id=$1 and for_date=$2`,
      [user_id, today],
    );
    const ids = daily.map((r) => r.exercise_id);
    expect(ids).toContain("lat-pulldown");
    expect(ids.filter((id) => id === "squat")).toHaveLength(1); // 두 번 담기지 않는다

    // 🔴 원칙 2 — 영구 루틴은 그대로(스쿼트 하나), 루틴 날짜도 안 밀린다.
    const kept = await dbQuery<{ exercise_id: string }>(
      `select exercise_id from public.routine_exercises where user_id=$1`,
      [user_id],
    );
    expect(kept.map((r) => r.exercise_id)).toEqual(["squat"]);
    const r = await dbQuery<{ d: string | null }>(
      `select last_deferred_date::text d from public.user_routines where user_id=$1`,
      [user_id],
    );
    expect(r[0]?.d ?? null).not.toBe(today);
  } finally {
    await cleanup();
  }
});

test("AI 트레이너: [바꾸기]는 오늘 원래 운동을 내일로 미루고 제안으로 채운다", async ({ page, baseURL }) => {
  test.skip(!AI_OPEN, "AI 가 닫혀 있다(AI_OPEN=false, 2026-10-01)");
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  const { user_id, today, cleanup } = await setup(page, baseURL!);
  try {
    await openWithPlan(page);
    // 스쿼트는 빼고 랫풀다운만.
    await page.getByTestId("ai-trainer-item-squat").click();
    await expect(page.getByTestId("ai-trainer-replace")).toHaveText("오늘 운동을 이 1개로 바꾸기");
    await page.getByTestId("ai-trainer-replace").click();
    await page.waitForURL("**/routine", { timeout: 15_000 });
    await expect(page.getByText("랫풀다운").first()).toBeVisible({ timeout: 10_000 });

    const daily = await dbQuery<{ exercise_id: string }>(
      `select exercise_id from public.daily_plan where user_id=$1 and for_date=$2`,
      [user_id, today],
    );
    expect(daily.map((r) => r.exercise_id)).toEqual(["lat-pulldown"]);
    // 오늘 원래 운동(스쿼트)은 사라지지 않고 내일로 — 기존 '운동 직접 담기'와 같은 표시.
    const r = await dbQuery<{ d: string | null }>(
      `select last_deferred_date::text d from public.user_routines where user_id=$1`,
      [user_id],
    );
    expect(r[0]?.d).toBe(today);
    // 🔴 원칙 2 — 영구 루틴 운동 목록은 그대로.
    const kept = await dbQuery<{ exercise_id: string }>(
      `select exercise_id from public.routine_exercises where user_id=$1`,
      [user_id],
    );
    expect(kept.map((r) => r.exercise_id)).toEqual(["squat"]);
  } finally {
    await cleanup();
  }
});

test("공개 전: 디버그 계정이 아니면 AI 트레이너 화면이 없다", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  await createTestAccount(page.context(), baseURL!, false);
  // 로딩 화면이 있는 경로는 스트리밍이라 상태 코드가 200 으로 온다 — 화면으로 확인한다.
  await page.goto("/ai-trainer", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("ai-trainer-state")).toHaveCount(0);
});
