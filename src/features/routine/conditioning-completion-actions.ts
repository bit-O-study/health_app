"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { isConditioningKind } from "@/features/routine/conditioning-catalog";
import type { CompletionStatus } from "@/features/routine/exercise-completions";

/**
 * 오늘 기준 워밍업/마무리 *행별* 상태 설정. status='clear' 이면 기록 제거.
 * source_row_id 로 식별하여 같은 item 이 여러 번 들어가도 독립 추적.
 */
export async function setConditioningStatusAction(
  kind: string,
  sourceRowId: string,
  itemId: string,
  status: CompletionStatus | "clear",
): Promise<void> {
  if (!isConditioningKind(kind) || !sourceRowId || !itemId) return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = seoulYmd();

  // 같은 행에 대한 기존 기록을 먼저 제거
  await supabase
    .from("conditioning_completions")
    .delete()
    .eq("user_id", user.id)
    .eq("for_date", today)
    .eq("source_row_id", sourceRowId);

  if (status !== "clear") {
    await supabase.from("conditioning_completions").insert({
      user_id: user.id,
      for_date: today,
      kind,
      item_id: itemId,
      source_row_id: sourceRowId,
      status,
    });
  }

  revalidatePath("/");
}
