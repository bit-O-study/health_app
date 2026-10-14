"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { resolveForDate } from "@/lib/offline/queued-date";
import { isConditioningKind } from "@/features/routine/conditioning-catalog";
import type { CompletionStatus } from "@/features/routine/exercise-completions";
import type { StatusActionResult } from "@/features/routine/completion-result";
import { toUserError } from "@/lib/user-error";

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
  /** 오프라인 대기 큐가 나중에 올릴 때 누른 순간의 날짜. 서버가 오늘/어제로 가둔다. */
  forDate?: string,
  /**
   * 화면을 다시 그리지 않는다(운동모드 전용, 2026-10-14).
   * 운동모드는 누르는 즉시 화면을 바꾸고 닫을 때 한 번 새로고침한다. 그런데 저장할 때마다
   * /routine 전체(조회 20여 개)를 서버에서 다시 그려 응답에 실어 보내서, 완료를 누를 때마다 버벅였다.
   */
  quiet?: boolean,
): Promise<StatusActionResult> {
  if (!isConditioningKind(kind) || !sourceRowId || !itemId) return { ok: true };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 큐가 올린 기록은 올린 날이 아니라 친 날에 들어가야 한다(setExerciseStatusAction 과 동일).
  const today = resolveForDate(forDate, seoulYmd());

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
  if (del.error) return { ok: false, error: toUserError(del.error) };

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
    if (error) return { ok: false, error: toUserError(error) };
  }

  // 홈 + 점수·기록 페이지 무효화 (클라이언트 Router Cache stale 방지).
  if (!quiet) {
    revalidatePath("/routine");
    revalidatePath("/settings/score");
    revalidatePath("/settings/history");
  }
  return { ok: true };
}
