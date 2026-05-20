"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import type { CompletionSnapshot } from "@/features/routine/exercise-completion-actions";

export type CondMarkInput = { rowId: string; itemId: string };

export type PlanMarkInput = {
  rowId: string;
  snapshot: CompletionSnapshot;
};

export async function markAllTodayCompleteAction(opts: {
  planRows: PlanMarkInput[];
  warmup: CondMarkInput[];
  cooldown: CondMarkInput[];
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = seoulYmd();

  if (opts.planRows.length > 0) {
    const rows = opts.planRows.map((p) => ({
      user_id: user.id,
      for_date: today,
      exercise_row_id: p.rowId,
      status: "done" as const,
      exercise_id: p.snapshot.exerciseId,
      equipment: p.snapshot.equipment,
      sets: p.snapshot.sets,
      reps: p.snapshot.reps,
      weight_kg: p.snapshot.weightKg,
      focus: p.snapshot.focus,
    }));
    await supabase
      .from("exercise_completions")
      .upsert(rows, { onConflict: "user_id,for_date,exercise_row_id" });
  }

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
