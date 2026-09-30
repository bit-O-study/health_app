import { expect, test } from "@playwright/test";

import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb } from "./helpers/db";
import { silenceDevOverlay } from "./helpers/dev-overlay";

/**
 * AI 트레이너 탭(2026-09-30 2단계).
 *
 * 🔴 사용자 결정 — AI 가 운동을 직접 바꾸지 않는다. 탭에서 오늘의 운동을 보고 [적용]을 눌러야
 *    '오늘만 운동 변경'으로 넘어간다. 영구 루틴은 그대로(원칙 2).
 *
 * 실제 AI 호출은 E2E 에서 부르지 않는다(비용·결과가 매번 다름). 개발 빌드 전용 입구
 * (`__jimkkunAiTrainerSeed`)로 제안을 넣고 [적용] 흐름을 끝까지 확인한다. AI 답을 읽고
 * 검사하는 규칙은 tests/be/logic/ai-trainer.test.ts 가 지킨다.
 */
test("AI 트레이너: 제안을 [적용]하면 오늘만 담기고, 루틴은 그대로", async ({ page, baseURL }) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");
  test.setTimeout(150_000);
  await silenceDevOverlay(page);

  const { email, supabase, user_id } = await createTestAccount(page.context(), baseURL!, false);
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

  // 아직 공개 전 기능 — 이 계정만 잠깐 디버그 계정으로(끝나면 되돌린다).
  await dbQuery(
    `insert into public.app_settings(key, value)
       values ('debug.accounts', jsonb_build_array($1::text))
     on conflict (key) do update
       set value = coalesce(public.app_settings.value, '[]'::jsonb) || jsonb_build_array($1::text)`,
    [email],
  );
  try {
    // 디버그 앱은 홈 앱 판에서 '편집'으로 꺼내야 보인다 — 여기선 화면으로 바로 간다.
    await page.goto("/ai-trainer", { waitUntil: "networkidle" });

    // 내 상태는 AI 없이 계산해 늘 보여 준다. 무엇을 보내는지 먼저 밝힌다.
    await expect(page.getByTestId("ai-trainer-state")).toContainText("이름·이메일·연락처는 보내지 않아요");
    // 🔴 동의 전엔 AI 를 부를 수 없다 — 동의 카드가 먼저, '짜 줘' 버튼은 없다.
    await expect(page.getByTestId("ai-trainer-consent")).toContainText("국외 서버");
    await expect(page.getByTestId("ai-trainer-generate")).toHaveCount(0);

    await page.waitForFunction(
      () => typeof (window as unknown as { __jimkkunAiTrainerSeed?: unknown }).__jimkkunAiTrainerSeed === "function",
    );
    await page.evaluate(() => {
      (window as unknown as { __jimkkunAiTrainerSeed: (p: unknown) => void }).__jimkkunAiTrainerSeed({
        summary: "등이 부족해서 당기기 위주로 가요.",
        items: [
          { exerciseId: "lat-pulldown", name: "랫풀다운", part: "back", equipment: "machine", reason: "등 주 0세트" },
          { exerciseId: "squat", name: "스쿼트", part: "lower", equipment: "barbell", reason: "오늘 하체 날" },
        ],
        tip: "천천히 내려요",
      });
    });

    const plan = page.getByTestId("ai-trainer-plan");
    await expect(plan).toContainText("등이 부족해서");
    await expect(page.getByTestId("ai-trainer-item-lat-pulldown")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("ai-trainer-apply")).toHaveText("2개 오늘 운동에 적용");

    // [적용] → 오늘 운동 화면으로. 스쿼트는 오늘 이미 해서 빠지고 랫풀다운만 더해진다.
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

    // 🔴 원칙 2 — 영구 루틴은 그대로(스쿼트 하나).
    const kept = await dbQuery<{ exercise_id: string }>(
      `select exercise_id from public.routine_exercises where user_id=$1`,
      [user_id],
    );
    expect(kept.map((r) => r.exercise_id)).toEqual(["squat"]);
  } finally {
    await dbQuery(
      `update public.app_settings
         set value = coalesce(
           (select jsonb_agg(e) from jsonb_array_elements_text(value) e where e <> $1),
           '[]'::jsonb)
       where key='debug.accounts'`,
      [email],
    );
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
