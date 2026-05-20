"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { isConditioningKind } from "@/features/routine/conditioning-catalog";
import type { CompletionStatus } from "@/features/routine/exercise-completions";

/** 오늘 기준 워밍업/마무리 항목 상태 설정. status='clear' 이면 기록 제거. */
export async function setConditioningStatusAction(
  kind: string,
  itemId: string,
  status: CompletionStatus | "clear",
): Promise<void> {
  if (!isConditioningKind(kind) || !itemId) return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = seoulYmd();

  if (status === "clear") {
    await supabase
      .from("conditioning_completions")
      .delete()
      .eq("user_id", user.id)
      .eq("for_date", today)
      .eq("kind", kind)
      .eq("item_id", itemId);
  } else {
    await supabase.from("conditioning_completions").upsert(
      {
        user_id: user.id,
        for_date: today,
        kind,
        item_id: itemId,
        status,
      },
      { onConflict: "user_id,for_date,kind,item_id" },
    );
  }

  revalidatePath("/");
}
