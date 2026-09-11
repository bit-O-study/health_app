import { expect, test } from "@playwright/test";
import { signUpAndOnboard, seedRecommendedExercisesViaUI } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";
import { prepareRecommendedExercises } from "./helpers/recommended-fixture";

for (const variant of ["fullbody", "custom-side"]) {
  test("추천 준비는 UI 결과와 운동 ID를 보존한다: " + variant, async ({ page }) => {
    test.skip(!hasDb, "needs DB credentials");
    const email = await signUpAndOnboard(page);
    if (variant === "custom-side") {
      await dbQuery("update public.user_routines set splits=0, variant_id='custom', custom_week=$2::jsonb where user_id=(select id from auth.users where email=$1)",
        [email, JSON.stringify([["chest", "triceps"], ["back"], ["rest"], ["chest"], ["rest"], ["rest"], ["rest"]])]);
    }
    await test.step("UI recommendation preparation", () => seedRecommendedExercisesViaUI(page));
    const snapshot = async () => (await dbQuery<{ exercises: unknown[]; conditioning: unknown[] }>(
      "select (select jsonb_agg(to_jsonb(e) - 'created_at' - 'updated_at' order by day_index, focus, position) from public.routine_exercises e where user_id=u.id) as exercises," +
      " (select jsonb_agg(to_jsonb(c) - 'id' - 'created_at' - 'updated_at' order by focus, kind, position) from public.routine_conditioning c where user_id=u.id) as conditioning" +
      " from auth.users u where email=$1", [email]))[0];
    const expected = await snapshot();
    expect(expected.exercises.length).toBeGreaterThan(0);
    expect(expected.conditioning.length).toBeGreaterThan(0);
    await dbQuery("update public.routine_exercises set weight_kg=999, memo='temporary' where user_id=(select id from auth.users where email=$1)", [email]);
    await test.step("Direct recommendation preparation", async () => {
      await prepareRecommendedExercises(email);
      await page.goto("/routine", { waitUntil: "networkidle" });
      await expect(page.getByRole("button", { name: "운동 시작" })).toBeVisible();
    });
    expect(await snapshot()).toEqual(expected);
  });
}
