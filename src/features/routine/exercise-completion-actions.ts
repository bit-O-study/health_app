"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import type { CompletionStatus } from "@/features/routine/exercise-completions";
import type { SetDetail } from "@/features/routine/set-details";

export type CompletionSnapshot = {
  exerciseId: string;
  equipment: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  focus: string;
  /** 세트별 무게·횟수 스냅샷. null = 균일. */
  setDetails?: SetDetail[] | null;
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
  const user = await getCurrentUser();
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
              set_details: snapshot.setDetails ?? null,
            }
          : {}),
      },
      { onConflict: "user_id,for_date,exercise_row_id" },
    );
  }

  // 모든 페이지가 force-dynamic 이라 /settings/* 까지 revalidate 할 필요 없음 — 그쪽 페이지 진입 시 자동으로 fresh fetch.
  // 홈만 무효화하고 클라이언트는 router.refresh() 없이 로컬 state 로 즉시 반영(스와이프 체감 지연 제거).
  revalidatePath("/");
}
