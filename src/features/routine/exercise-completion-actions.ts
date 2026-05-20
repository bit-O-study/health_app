"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import type { CompletionStatus } from "@/features/routine/exercise-completions";

/**
 * 오늘 기준으로 특정 운동의 상태를 설정한다.
 *   - "done"    완료
 *   - "skipped" 오늘은 안 함
 *   - "clear"   기록 제거(원래 상태로)
 */
export async function setExerciseStatusAction(
  exerciseRowId: string,
  status: CompletionStatus | "clear",
): Promise<void> {
  if (!exerciseRowId) return;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = seoulYmd();

  if (status === "clear") {
    await supabase
      .from("exercise_completions")
      .delete()
      .eq("user_id", user.id)
      .eq("for_date", today)
      .eq("exercise_row_id", exerciseRowId);
  } else {
    await supabase.from("exercise_completions").upsert(
      {
        user_id: user.id,
        for_date: today,
        exercise_row_id: exerciseRowId,
        status,
      },
      { onConflict: "user_id,for_date,exercise_row_id" },
    );
  }

  revalidatePath("/");
  revalidatePath("/settings/score");
}
