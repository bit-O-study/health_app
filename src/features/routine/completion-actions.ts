"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";

/** 오늘 운동을 완료 처리. 이미 있으면 칼로리/부위만 갱신. */
export async function markWorkoutCompleteAction(
  focus: string,
  calories: number | null,
): Promise<void> {
  if (!focus) return;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("workout_completions").upsert(
    {
      user_id: user.id,
      for_date: seoulYmd(),
      focus,
      calories,
    },
    { onConflict: "user_id,for_date" },
  );

  revalidatePath("/");
  revalidatePath("/settings/score");
}

/** 오늘 완료를 취소(삭제) */
export async function unmarkWorkoutCompleteAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("workout_completions")
    .delete()
    .eq("user_id", user.id)
    .eq("for_date", seoulYmd());

  revalidatePath("/");
  revalidatePath("/settings/score");
}
