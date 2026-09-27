import { expect, test } from "@playwright/test";
import { signUpAndOnboard, signUpAndOnboardViaUI } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

test("API 준비는 실제 UI 온보딩과 같은 프로필·빈 기본 루틴을 만든다", async ({ page, browser, baseURL }) => {
  test.skip(!hasDb, "needs DB credentials for fixture parity");
  const uiEmail = await signUpAndOnboardViaUI(page);
  const context = await browser.newContext({ baseURL });
  try {
    const apiPage = await context.newPage();
    const apiEmail = await signUpAndOnboard(apiPage);
    expect(apiEmail).not.toBe(uiEmail);
    const rows = await dbQuery<{ email: string; profile: unknown; routine: unknown; exercises: string; conditioning: string }>(
      "select u.email," +
      " (select jsonb_build_object('gender',gender,'experience',experience,'height_cm',height_cm,'weight_kg',weight_kg,'body_type',body_type,'goal',goal,'name',name,'nickname',nickname,'phone',phone,'lock_weight_reps',lock_weight_reps,'hide_exercise_videos',hide_exercise_videos,'show_exercise_guide',show_exercise_guide,'rest_sound',rest_sound,'rest_haptic',rest_haptic) from public.profiles where user_id=u.id) as profile," +
      " (select jsonb_build_object('splits',splits,'variant_id',variant_id,'custom_week',custom_week,'baseline_routine',baseline_routine,'start_date',start_date,'day_index_migrated',day_index_migrated,'rest_date',rest_date,'override_date',override_date,'override_block',override_block) from public.user_routines where user_id=u.id) as routine," +
      " (select count(*)::text from public.routine_exercises where user_id=u.id) as exercises," +
      " (select count(*)::text from public.routine_conditioning where user_id=u.id) as conditioning" +
      " from auth.users u where email=any($1::text[])", [[uiEmail, apiEmail]],
    );
    expect(rows).toHaveLength(2);
    const ui = rows.find(r => r.email === uiEmail)!;
    const api = rows.find(r => r.email === apiEmail)!;
    expect(api.profile).toEqual(ui.profile);
    expect(api.routine).toEqual(ui.routine);
    expect([api.exercises, api.conditioning, ui.exercises, ui.conditioning]).toEqual(["0", "0", "0", "0"]);
    await expect(apiPage.getByRole("heading", { name: "오늘의 운동" })).toBeVisible();
  } finally {
    await context.close();
  }
});
