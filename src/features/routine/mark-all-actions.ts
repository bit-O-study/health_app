"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";

export type CondMarkInput = { rowId: string; itemId: string };

/**
 * 오늘 본운동/워밍업/마무리를 한 번에 완료 처리.
 * 호출자가 휴식 처리되지 않은 항목만 추려 보내야 함.
 */
export async function markAllTodayCompleteAction(opts: {
  planRowIds: string[];
  warmup: CondMarkInput[];
  cooldown: CondMarkInput[];
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

  // 워밍업/마무리: source_row_id 단위로 기존 기록 제거 후 done insert
  const condEntries: { kind: "warmup" | "cooldown"; row: CondMarkInput }[] = [
    ...opts.warmup.map((row) => ({ kind: "warmup" as const, row })),
    ...opts.cooldown.map((row) => ({ kind: "cooldown" as const, row })),
  ];
  if (condEntries.length > 0) {
    await Promise.all(
      condEntries.map(({ row }) =>
        supabase
          .from("conditioning_completions")
          .delete()
          .eq("user_id", user.id)
          .eq("for_date", today)
          .eq("source_row_id", row.rowId),
      ),
    );
    const inserts = condEntries.map(({ kind, row }) => ({
      user_id: user.id,
      for_date: today,
      kind,
      item_id: row.itemId,
      source_row_id: row.rowId,
      status: "done" as const,
    }));
    await supabase.from("conditioning_completions").insert(inserts);
  }

  revalidatePath("/");
  revalidatePath("/settings/score");
  revalidatePath("/settings/history");
}
