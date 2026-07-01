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
  sets?: number | null;
  reps?: number | null;
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

  // 이 '행(source_row_id)' 의 기존 기록만 제거하고 새로 넣는다.
  // ⚠ 예전엔 (kind,item_id) 로도 함께 지웠는데, 루틴에 같은 항목(예: 러닝)이 여러 개
  //   있으면(경사/속도/시간만 다른 쿨다운 러닝 3개 등) 하나를 완료할 때 나머지 러닝
  //   완료기록까지 삭제돼 사라지는 버그가 있었다. 행 단위(source_row_id)로만 판정한다.
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
      sets: snapshot?.sets ?? null,
      reps: snapshot?.reps ?? null,
    });
    if (error) return { ok: false, error: error.message };
  }

  // 홈 + 점수·기록 페이지 무효화 (클라이언트 Router Cache stale 방지).
  revalidatePath("/routine");
  revalidatePath("/settings/score");
  revalidatePath("/settings/history");
  return { ok: true };
}
