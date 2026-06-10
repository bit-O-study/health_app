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

/**
 * 전체 운동 비우기 — 본운동(routine_exercises)·워밍업/마무리(routine_conditioning)
 * 와 '오늘만 변경' 오버라이드(daily_plan/daily_conditioning)를 모두 삭제한다.
 * 즉시 DB 에 반영(저장 불필요). 완료 기록(점수·기록)은 건드리지 않는다.
 */
export async function clearAllPlanAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const uid = user.id;

  const results = await Promise.all([
    supabase.from("routine_exercises").delete().eq("user_id", uid),
    supabase.from("routine_conditioning").delete().eq("user_id", uid),
    supabase.from("daily_plan").delete().eq("user_id", uid),
    supabase.from("daily_conditioning").delete().eq("user_id", uid),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  revalidatePath("/routine");
  revalidatePath("/plan");
  return { ok: true };
}
