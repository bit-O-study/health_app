"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { isConditioningKind } from "@/features/routine/conditioning-catalog";
import type { CompletionStatus } from "@/features/routine/exercise-completions";
import type { StatusActionResult } from "@/features/routine/completion-result";

export type CondSnapshot = {
  durationMin: number | null;
  speed: number | null;
  incline: number | null;
};

/**
 * 오늘 기준 워밍업/마무리 *행별* 상태 설정. snapshot 이 있으면
 * 시간·속도·경사 값을 함께 기록해 기록 화면에서 그대로 보여준다.
 */
export async function setConditioningStatusAction(
  kind: string,
  sourceRowId: string,
  itemId: string,
  status: CompletionStatus | "clear",
  snapshot?: CondSnapshot,
): Promise<StatusActionResult> {
  if (!isConditioningKind(kind) || !sourceRowId || !itemId) return { ok: true };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const today = seoulYmd();

  // 같은 행에 대한 기존 기록을 먼저 제거(= 취소 시 기록에서도 삭제)
  const del = await supabase
    .from("conditioning_completions")
    .delete()
    .eq("user_id", user.id)
    .eq("for_date", today)
    .eq("source_row_id", sourceRowId);
  if (del.error) return { ok: false, error: del.error.message };

  if (status !== "clear") {
    const { error } = await supabase.from("conditioning_completions").insert({
      user_id: user.id,
      for_date: today,
      kind,
      item_id: itemId,
      source_row_id: sourceRowId,
      status,
      duration_min: snapshot?.durationMin ?? null,
      speed: snapshot?.speed ?? null,
      incline: snapshot?.incline ?? null,
    });
    if (error) return { ok: false, error: error.message };
  }

  // 홈 + 점수·기록 페이지 무효화 (클라이언트 Router Cache stale 방지).
  revalidatePath("/");
  revalidatePath("/settings/score");
  revalidatePath("/settings/history");
  return { ok: true };
}
