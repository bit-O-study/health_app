"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import type { CompletionStatus } from "@/features/routine/exercise-completions";

export type CompletionSnapshot = {
  exerciseId: string;
  equipment: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  focus: string;
};

/**
 * 오늘 기준으로 특정 운동의 상태를 설정. snapshot 을 함께 넘기면
 * 계획이 바뀌어도 화면/통계가 손실 없이 표시되도록 행에 기록한다.
 */
export async function setExerciseStatusAction(
  exerciseRowId: string,
  status: CompletionStatus | "clear",
  snapshot?: CompletionSnapshot,
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
        ...(snapshot
          ? {
              exercise_id: snapshot.exerciseId,
              equipment: snapshot.equipment,
              sets: snapshot.sets,
              reps: snapshot.reps,
              weight_kg: snapshot.weightKg,
              focus: snapshot.focus,
            }
          : {}),
      },
      { onConflict: "user_id,for_date,exercise_row_id" },
    );
  }

  revalidatePath("/");
  revalidatePath("/settings/score");
  revalidatePath("/settings/history");
  revalidatePath(`/settings/history/${today}`);
}
