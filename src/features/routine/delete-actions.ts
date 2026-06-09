"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";

/**
 * 본운동 행 삭제. rowId 는 routine_exercises.id 또는 daily_plan.id 일 수 있어
 * 양쪽 테이블 모두에서 시도하고, 해당 행의 완료 기록(exercise_completions)도 제거.
 * (기록·점수에서도 함께 사라짐)
 */
export async function deleteMainExerciseAction(rowId: string): Promise<void> {
  if (!rowId) return;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return;

  await Promise.all([
    supabase
      .from("routine_exercises")
      .delete()
      .eq("user_id", user.id)
      .eq("id", rowId),
    supabase.from("daily_plan").delete().eq("user_id", user.id).eq("id", rowId),
    supabase
      .from("exercise_completions")
      .delete()
      .eq("user_id", user.id)
      .eq("exercise_row_id", rowId),
  ]);

  // /settings/*, /plan* 는 모두 force-dynamic → 진입 시 fresh — 홈만 무효화
  revalidatePath("/routine");
}

/**
 * 워밍업/마무리 행 삭제. rowId 는 routine_conditioning.id 또는
 * daily_conditioning.id 일 수 있음. 두 테이블 + conditioning_completions 모두 제거.
 */
export async function deleteConditioningRowAction(
  rowId: string,
): Promise<void> {
  if (!rowId) return;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return;

  await Promise.all([
    supabase
      .from("routine_conditioning")
      .delete()
      .eq("user_id", user.id)
      .eq("id", rowId),
    supabase
      .from("daily_conditioning")
      .delete()
      .eq("user_id", user.id)
      .eq("id", rowId),
    supabase
      .from("conditioning_completions")
      .delete()
      .eq("user_id", user.id)
      .eq("source_row_id", rowId),
  ]);

  revalidatePath("/routine");
}
