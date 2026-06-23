"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import type { CompletionStatus } from "@/features/routine/exercise-completions";
import type { SetDetail } from "@/features/routine/set-details";
import type { StatusActionResult } from "@/features/routine/completion-result";

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
): Promise<StatusActionResult> {
  if (!exerciseRowId) return { ok: true };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const today = seoulYmd();

  // supabase 클라이언트는 에러를 throw 하지 않고 { error } 로 돌려준다.
  // 이전엔 이를 무시해 RLS/스키마 실패가 조용히 묻혔다 — 반드시 확인해 반환한다.
  if (status === "clear") {
    // 이 행 id 뿐 아니라 같은 (부위:운동) 기록도 함께 지운다. 루틴을 바꿔 행 id 가
    // 새로 생기면 완료는 (부위:운동) 폴백 키로 표시되는데, 표시행 id 로만 지우면 원본
    // 기록이 남아 '취소해도 완료로 남는' 버그가 생긴다(컨디셔닝과 동일 처리).
    const base = supabase
      .from("exercise_completions")
      .delete()
      .eq("user_id", user.id)
      .eq("for_date", today);
    const { error } =
      snapshot?.focus && snapshot?.exerciseId
        ? await base.or(
            `exercise_row_id.eq.${exerciseRowId},and(focus.eq.${snapshot.focus},exercise_id.eq.${snapshot.exerciseId})`,
          )
        : await base.eq("exercise_row_id", exerciseRowId);
    if (error) return { ok: false, error: error.message };
  } else {
    // 같은 (부위:운동) 의 '옛 행 id' 기록을 먼저 정리 — 루틴 변경으로 행 id 가 바뀌면
    // upsert(행 id 기준)가 중복 완료 기록을 만들 수 있어 미리 제거한다.
    if (snapshot?.focus && snapshot?.exerciseId) {
      await supabase
        .from("exercise_completions")
        .delete()
        .eq("user_id", user.id)
        .eq("for_date", today)
        .eq("focus", snapshot.focus)
        .eq("exercise_id", snapshot.exerciseId)
        .neq("exercise_row_id", exerciseRowId);
    }
    const { error } = await supabase.from("exercise_completions").upsert(
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
    if (error) return { ok: false, error: error.message };
  }

  // 홈 + 점수·기록 페이지 무효화. force-dynamic 이라도 클라이언트 Router Cache 때문에
  // 소프트 네비게이션 시 stale 이 보일 수 있어, 완료 기록이 반영되는 화면들을 명시 무효화.
  revalidatePath("/routine");
  revalidatePath("/settings/score");
  revalidatePath("/settings/history");
  return { ok: true };
}
