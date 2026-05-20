"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";

/**
 * 오늘 본운동/워밍업/마무리를 한 번에 완료 처리.
 * 호출자가 휴식 처리되지 않은 항목만 추려 보내야 함(휴식 의도 유지).
 */
export async function markAllTodayCompleteAction(opts: {
  planRowIds: string[];
  warmupItemIds: string[];
  cooldownItemIds: string[];
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = seoulYmd();

  if (opts.planRowIds.length > 0) {
    const rows = opts.planRowIds.map((id) => ({
      user_id: user.id,
      for_date: today,
      exercise_row_id: id,
      status: "done" as const,
    }));
    await supabase
      .from("exercise_completions")
      .upsert(rows, { onConflict: "user_id,for_date,exercise_row_id" });
  }

  const condRows: {
    user_id: string;
    for_date: string;
    kind: "warmup" | "cooldown";
    item_id: string;
    status: "done";
  }[] = [];
  for (const itemId of opts.warmupItemIds) {
    condRows.push({
      user_id: user.id,
      for_date: today,
      kind: "warmup",
      item_id: itemId,
      status: "done",
    });
  }
  for (const itemId of opts.cooldownItemIds) {
    condRows.push({
      user_id: user.id,
      for_date: today,
      kind: "cooldown",
      item_id: itemId,
      status: "done",
    });
  }
  if (condRows.length > 0) {
    await supabase
      .from("conditioning_completions")
      .upsert(condRows, { onConflict: "user_id,for_date,kind,item_id" });
  }

  revalidatePath("/");
  revalidatePath("/settings/score");
  revalidatePath("/settings/history");
}
