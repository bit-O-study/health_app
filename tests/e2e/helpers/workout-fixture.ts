import type { BrowserContext } from "@playwright/test";
import { createTestAccount } from "./account-fixture";

/** Minimal independent fixture for the set-edit regression. */
export async function prepareSetsEditWorkout(context: BrowserContext, baseURL: string): Promise<string> {
  const { email, supabase, user_id } = await createTestAccount(context, baseURL, true);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const routine = await supabase.from("user_routines").insert({
    user_id, splits: 0, variant_id: "custom",
    custom_week: [["lower"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"]],
    start_date: today, day_index_migrated: true,
  });
  if (routine.error) throw routine.error;
  const exercise = await supabase.from("routine_exercises").insert({
    user_id, day_index: 0, focus: "lower", position: 0, exercise_id: "squat",
    equipment: "barbell", sets: 4, reps: 8, weight_kg: 60,
  });
  if (exercise.error) throw exercise.error;
  return email;
}
